-- The modification history: who changed what, when, and to what.
--
-- The application has an access model since the RBAC foundation, but no memory
-- of it being used. A permission handed over and taken back an hour later, a
-- scoring spec rewritten — which silently rewrites every past game's statistics
-- — a finished game's winner quietly swapped: nothing left a trace, so the only
-- way to notice was to already know what the row used to say.
--
-- What gets recorded is a crossing of TABLE × ACTION rather than a flat "log
-- everything": a history nobody can read through is a history nobody reads.
--
--   Administration tables       every insert, update and delete. These are rare
--                               and each one changes what the app IS.
--   Game tables                 only once the game is over — the result as it
--                               was filed, and every later correction to it.
--                               Owner's rule (2026-09-23): « les données issues
--                               des parties en cours de route ne sont
--                               effectivement pas intéressantes. Seulement les
--                               données finales enregistrées de la partie ».
--                               A delete is always recorded, ended or not:
--                               making a game disappear is exactly the act this
--                               table exists to catch.
--   Turn-by-turn tables         not recorded at all: `game_turns`, `dice_rolls`,
--                               `game_phases`, `game_stage_passes`,
--                               `game_milestones`. They are the game being
--                               played, and they outnumber everything else by
--                               an order of magnitude (469 turns against 199
--                               administrative writes, measured on production).
--   `auth_rate_limits`          not recorded: it is written by the login path on
--                               every attempt, by nobody.
--
-- ⚠️ This table is append-only and there is no rollback, by decision. A history
-- that can be edited proves nothing, and an undo button would have to re-apply
-- a row against constraints and foreign keys that have moved on since.

create table public.audit_log (
  -- A sequence and not a uuid: the point of this table is the order things
  -- happened in, and a uuid sorts by nothing. Two writes inside one transaction
  -- share `occurred_at` to the microsecond.
  id           bigserial primary key,
  occurred_at  timestamptz not null default now(),
  -- The resource: which table, which row, and what that row was CALLED at the
  -- time. The label is frozen on purpose — it has to survive the row it names
  -- being deleted, which is the case the reader most needs to understand.
  table_name   text not null,
  record_id    text not null,
  record_label text,
  action       text not null check (action in ('insert', 'update', 'delete')),
  -- The author. `actor_id` deliberately carries NO foreign key to `auth.users`:
  -- a deleted account must not take its history with it.
  actor_id     uuid,
  actor_email  text,
  -- The roles held at that instant, and whether a simulation was narrowing
  -- them. Both frozen: a role composed differently next month would otherwise
  -- rewrite the meaning of every past line.
  actor_roles  text[] not null default '{}',
  simulated    boolean not null default false,
  -- 'app' when a signed-in account did it, 'out-of-session' when it came from
  -- outside a session — a migration, or the management API. That distinction is
  -- the whole point of the column: a change nobody signed for is the first thing
  -- to look at.
  channel      text not null check (channel in ('app', 'out-of-session')),
  -- Groups the writes of one transaction, so « il a changé le rôle » and « puis
  -- il s'est donné la permission » read as one act rather than two coincidences.
  tx_id        bigint not null,
  old_value    jsonb,
  new_value    jsonb,
  -- The columns that actually moved. Derivable from the two values above, kept
  -- anyway: it is what the screen lists, and what makes « toutes les
  -- modifications de barème » a query instead of a diff in JavaScript.
  changed_keys text[]
);

comment on table public.audit_log is
  'Append-only history of the administrative writes and of the finished games. '
  'Written only by the audit triggers; readable with audit.read; never updated '
  'or deleted from the application.';

-- The screen reads it newest-first, filtered by resource or by author.
create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_table_name_idx
  on public.audit_log (table_name, occurred_at desc);
create index audit_log_actor_id_idx on public.audit_log (actor_id, occurred_at desc);

/**
 * The labels of the roles the caller holds right now.
 *
 * SECURITY DEFINER because `user_roles` is behind RLS whose policy calls
 * `has_permission()`; asking it as the caller would either come back empty or
 * recurse. `search_path` is pinned for the usual reason — an unpinned definer
 * function resolves its table names against whatever schema the caller puts
 * first.
 */
create function public.audit_actor_roles()
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(r.label order by r.label), '{}')
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = (select auth.uid());
$$;

/**
 * Which columns moved between two versions of a row.
 */
create function public.audit_changed_keys(p_old jsonb, p_new jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(e.key order by e.key), '{}')
  from jsonb_each(p_new) as e
  where e.value is distinct from p_old -> e.key;
$$;

/**
 * What a game is called, for a history line to be readable: the game played,
 * and the day it was played on.
 *
 * Returns nothing when the game is already gone — which happens on the child
 * rows a cascading delete takes with it. The line still carries the table, the
 * id and the whole deleted row, so nothing is lost but the pleasantry.
 */
create function public.audit_game_label(p_game_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.name || ' du ' || to_char(g.started_at, 'DD/MM/YYYY')
  from public.games g
  join public.boardgames b on b.id = g.boardgame_id
  where g.id = p_game_id;
$$;

/**
 * What the row being audited is called, in the words the screen will show.
 *
 * One function rather than a label column named per trigger, because half the
 * tables have no name of their own: an assignment is « une adresse · un rôle »,
 * a line of the grid is « un rôle · une clé ». Those readings belong together,
 * and the reader has no way to resolve them later — the row may be gone.
 */
create function public.audit_label(p_table text, p_row jsonb)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_label text;
begin
  case p_table
    when 'boardgames', 'players', 'configs', 'extensions', 'extension_scenarios' then
      v_label := p_row ->> 'name';

    when 'roles', 'permissions' then
      v_label := p_row ->> 'label';

    when 'faq_entries' then
      v_label := p_row ->> 'question';

    when 'feedback' then
      v_label := left(p_row ->> 'message', 80);

    when 'config_templates' then
      v_label := (
        select b.name
        from public.boardgames b
        where b.id = (p_row ->> 'boardgame_id')::uuid
      );

    when 'role_permissions' then
      v_label := coalesce(
        (select r.label from public.roles r where r.id = (p_row ->> 'role_id')::uuid),
        p_row ->> 'role_id'
      ) || ' · ' || (p_row ->> 'permission_key');

    when 'user_roles' then
      v_label := coalesce(
        (select u.email::text from auth.users u where u.id = (p_row ->> 'user_id')::uuid),
        p_row ->> 'user_id'
      ) || ' · ' || coalesce(
        (select r.label from public.roles r where r.id = (p_row ->> 'role_id')::uuid),
        p_row ->> 'role_id'
      );

    when 'permission_simulations' then
      v_label := (
        select u.email::text
        from auth.users u
        where u.id = (p_row ->> 'user_id')::uuid
      );

    -- Composed from the row itself and not looked up: on a delete the game is
    -- already gone by the time this runs, and a deleted game with no name is
    -- the one line a reader will most want to be able to read.
    when 'games' then
      v_label := concat_ws(
        ' du ',
        (
          select b.name
          from public.boardgames b
          where b.id = (p_row ->> 'boardgame_id')::uuid
        ),
        to_char((p_row ->> 'started_at')::timestamptz, 'DD/MM/YYYY')
      );

    when 'game_players' then
      v_label := concat_ws(
        ' · ',
        public.audit_game_label((p_row ->> 'game_id')::uuid),
        (select p.name from public.players p where p.id = (p_row ->> 'player_id')::uuid)
      );

    when 'game_stages', 'game_stage_scores', 'score_events', 'game_extensions' then
      v_label := public.audit_game_label((p_row ->> 'game_id')::uuid);

    else
      v_label := null;
  end case;

  return v_label;
end;
$$;

/**
 * Writes one line — and decides, for an update, whether there is a line to
 * write at all. Both trigger functions below go through here, so the identity
 * of the author and the definition of « une modification » live in one place.
 *
 * Two kinds of update are dropped:
 *   — the ones that change nothing. The application re-saves whole forms, so
 *     the alternative is a history where most lines say « rien ».
 *   — the ones that only touch a column the database maintains itself
 *     (`boardgames.has_games`, `players.has_played`). Starting a game flips
 *     those by trigger; recording it would put « a modifié le jeu Cascadia »
 *     under the name of somebody who merely sat down to play it, which is a
 *     false alarm in the one table meant to raise real ones.
 *
 * SECURITY DEFINER: the table grants nobody an insert, and must not — an
 * account able to write its own history would be writing an alibi.
 */
create function public.audit_write(
  p_table text,
  p_action text,
  p_keys text[],
  p_derived text[],
  p_old jsonb,
  p_new jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row     jsonb := coalesce(p_new, p_old);
  v_actor   uuid  := (select auth.uid());
  v_changed text[];
begin
  if p_action = 'update' then
    v_changed := public.audit_changed_keys(p_old, p_new);

    if cardinality(v_changed) = 0 or v_changed <@ p_derived then
      return;
    end if;
  end if;

  insert into public.audit_log (
    table_name, record_id, record_label, action,
    actor_id, actor_email, actor_roles, simulated,
    channel, tx_id, old_value, new_value, changed_keys
  )
  values (
    p_table,
    (
      select string_agg(v_row ->> k.name, '/' order by k.ord)
      from unnest(p_keys) with ordinality as k(name, ord)
    ),
    public.audit_label(p_table, v_row),
    p_action,
    v_actor,
    (select u.email::text from auth.users u where u.id = v_actor),
    public.audit_actor_roles(),
    public.simulated_role_ids() is not null,
    case when v_actor is null then 'out-of-session' else 'app' end,
    pg_current_xact_id()::text::bigint,
    p_old,
    p_new,
    v_changed
  );
end;
$$;

/**
 * The trigger the administration tables carry: everything, every time.
 *
 * Arguments: the primary-key columns, then the columns the database maintains
 * on its own. The key columns are declared rather than read back from the
 * catalogue on every row — half of these tables have a composite key, and the
 * trigger already knows which.
 */
create function public.record_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.audit_write(
    tg_table_name,
    lower(tg_op),
    string_to_array(tg_argv[0], ','),
    string_to_array(coalesce(tg_argv[1], ''), ','),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return null;
end;
$$;

/**
 * The trigger the game tables carry: the finished game only.
 *
 * The second argument names the column holding the game's id — `id` on `games`
 * itself, `game_id` on its children. The gate is then the same question for
 * both, because an AFTER trigger already sees the table as the statement left
 * it: is that game `ended`?
 *
 * That ordering is not an accident. The application flips the game to `ended`
 * BEFORE writing the final scores into `game_players`, so the result as filed
 * is recorded while the whole game played to get there is not. An insert that
 * arrives already ended is recorded too — « Ajouter une partie terminée »
 * writes exactly that.
 *
 * A delete is recorded whatever the game's state, and without a lookup: on a
 * cascade the parent may already be gone.
 *
 * The check lives in the body rather than in a `when` clause because a trigger
 * condition may not contain a subquery.
 */
create function public.record_finished_game_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if tg_op <> 'DELETE' and not exists (
    select 1
    from public.games g
    where g.id = (v_row ->> tg_argv[1])::uuid
      and g.status = 'ended'
  ) then
    return null;
  end if;

  perform public.audit_write(
    tg_table_name,
    lower(tg_op),
    string_to_array(tg_argv[0], ','),
    '{}'::text[],
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return null;
end;
$$;

-- Nobody executes these by hand. Postgres hands EXECUTE on a new function to
-- the PUBLIC pseudo-role, which a `revoke … from anon` leaves entirely alone —
-- and `audit_write` is a SECURITY DEFINER function that INSERTS.
revoke execute on function public.audit_actor_roles() from public, anon, authenticated;
revoke execute on function public.audit_changed_keys(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.audit_game_label(uuid) from public, anon, authenticated;
revoke execute on function public.audit_label(text, jsonb) from public, anon, authenticated;
revoke execute on function public.audit_write(text, text, text[], text[], jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.record_audit() from public, anon, authenticated;
revoke execute on function public.record_finished_game_audit() from public, anon, authenticated;

-- The permission that opens the screen. Read-only, and there is no other:
-- writing the history is the triggers' business and erasing it is nobody's.
insert into public.permissions (key, section, action, label, sort_order) values
  ('audit.read', 'Administration', 'read', 'Consulter l''historique des modifications', 85);

alter table public.audit_log enable row level security;

-- ⚠️ The revoke is not belt-and-braces: `20260612201714_grant_table_privileges`
-- leaves an `alter default privileges` behind, so a new table is granted INSERT,
-- UPDATE and DELETE to anon and authenticated the moment it is created. The
-- select grant is put back by hand, because a policy without a grant never runs.
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- Read with the permission, and that is the only policy there is. No insert,
-- update or delete policy exists for anybody, which is what « append-only »
-- means here: the triggers write past RLS as the owner, the application cannot.
create policy audit_log_read on public.audit_log
  for select to authenticated using ((select public.has_permission('audit.read')));

-- The triggers, last: the catalogue insert above is this migration's own doing
-- and has no business being the history's first line.
create trigger audit_boardgames after insert or update or delete on public.boardgames
  for each row execute function public.record_audit('id', 'has_games');
create trigger audit_config_templates after insert or update or delete on public.config_templates
  for each row execute function public.record_audit('boardgame_id');
create trigger audit_configs after insert or update or delete on public.configs
  for each row execute function public.record_audit('id');
create trigger audit_players after insert or update or delete on public.players
  for each row execute function public.record_audit('id', 'has_played');
create trigger audit_extensions after insert or update or delete on public.extensions
  for each row execute function public.record_audit('id');
create trigger audit_extension_scenarios after insert or update or delete on public.extension_scenarios
  for each row execute function public.record_audit('id');
create trigger audit_faq_entries after insert or update or delete on public.faq_entries
  for each row execute function public.record_audit('id');
create trigger audit_feedback after insert or update or delete on public.feedback
  for each row execute function public.record_audit('id');
create trigger audit_permissions after insert or update or delete on public.permissions
  for each row execute function public.record_audit('key');
create trigger audit_roles after insert or update or delete on public.roles
  for each row execute function public.record_audit('id');
create trigger audit_role_permissions after insert or update or delete on public.role_permissions
  for each row execute function public.record_audit('role_id,permission_key');
create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function public.record_audit('user_id,role_id');
create trigger audit_permission_simulations after insert or update or delete on public.permission_simulations
  for each row execute function public.record_audit('user_id');

create trigger audit_games after insert or update or delete on public.games
  for each row execute function public.record_finished_game_audit('id', 'id');
create trigger audit_game_players after insert or update or delete on public.game_players
  for each row execute function public.record_finished_game_audit('game_id,player_id', 'game_id');
create trigger audit_game_extensions after insert or update or delete on public.game_extensions
  for each row execute function public.record_finished_game_audit('game_id,extension_id', 'game_id');
create trigger audit_game_stages after insert or update or delete on public.game_stages
  for each row execute function public.record_finished_game_audit('game_id,stage', 'game_id');
create trigger audit_game_stage_scores after insert or update or delete on public.game_stage_scores
  for each row execute function public.record_finished_game_audit('game_id,stage,player_id', 'game_id');
create trigger audit_score_events after insert or update or delete on public.score_events
  for each row execute function public.record_finished_game_audit('id', 'game_id');
