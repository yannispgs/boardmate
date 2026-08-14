-- Every policy in the schema, rewritten to ask a permission instead of asking
-- « are you logged in ».
--
-- The mappings below are the whole review surface: one line per table, naming
-- the permission family that governs it. Everything else is mechanical — four
-- policies per table, one per SQL command, each calling `has_permission` wrapped
-- in a `(select …)` so Postgres evaluates it once per statement instead of once
-- per row.
--
-- Tables come in three groups, because the catalogue is CRUD only where CRUD
-- was enough:
--
--   1. plain — one permission family, four verbs, nothing to think about.
--   2. scoring — `configs` and `config_templates` are the barème in table form,
--      so writing them asks `boardgames.updateScoring` while reading them rides
--      along with `boardgames.read`. Editing a scoring spec and editing the
--      fields that feed it are the same act; splitting *those two* would let
--      somebody change what a game asks for without being able to change what it
--      does with the answers.
--   3. game children — nine tables hanging off `games` with no status of their
--      own. Which permission applies depends on the parent: a turn added to
--      tonight's game is `games.updateLive`, the same row edited next week is
--      `games.updateDone`.
--
-- Written by hand after the loops: `games` itself (the status lives on the row),
-- `boardgames` update (fiche vs barème, split by trigger — a policy cannot see
-- which column moved), `extension_scenarios`, which already refuses to touch
-- official scenarios, and `feedback`, which nobody may edit after the fact.
--
-- Not touched: `auth_rate_limits`, which carries no policy at all and is reached
-- only by the service role.

do $$
declare
  -- 1. Plain tables: `<family>.create/read/update/delete`, nothing finer.
  plain constant text[][] := array[
    ['boardgames',  'boardgames'],  -- update overridden below (fiche vs barème)
    ['faq_entries', 'faq'],
    ['players',     'players']
  ];
  -- 2. The barème in table form: read with the game, write with the barème.
  scoring constant text[] := array['configs', 'config_templates'];
  -- 3. Everything hanging off a game, keyed by `game_id`, in two halves.
  --
  -- `setup` is what creating a game writes: who is at the table, which manches
  -- it will have, which extensions are in play, and the scores of a game entered
  -- after the fact. Their INSERT answers to `games.create` as well, because
  -- otherwise « lancer une partie » would need `games.updateLive` to finish
  -- writing the party it just started — which reads like a bug even when it is
  -- deliberate (owner, 2026-08-14).
  --
  -- `gameplay` is what the evening writes, one row at a time. Nothing there is
  -- part of creating anything, so it stays strictly on the parent's status: a
  -- role allowed to open a table does not thereby get to play at every other
  -- one.
  --
  -- UPDATE and DELETE are status-only on both halves. `games.create` writes a
  -- game, it never rewrites one.
  setup constant text[] := array[
    'game_players', 'game_stages', 'game_extensions', 'game_stage_scores'
  ];
  gameplay constant text[] := array[
    'game_turns', 'game_stage_passes', 'game_milestones', 'score_events',
    'dice_rolls'
  ];
  -- Which of the two update permissions a child row answers to, decided by the
  -- parent's status. `game_is_ongoing` is SECURITY DEFINER for the usual reason
  -- (see its comment): read here, a game the caller cannot see would answer
  -- « not ongoing » and route him to the wrong permission.
  by_status constant text :=
    'case when public.game_is_ongoing(game_id) '
    'then (select public.has_permission(''games.updateLive'')) '
    'else (select public.has_permission(''games.updateDone'')) end';
  entry text[];
  tbl   text;
  perm  text;
  pol   record;
begin
  -- Drop whatever was there rather than assume its name: some tables carry a
  -- single `for all` policy from the initial schema, others four named ones
  -- added later, and a stale permissive policy left behind would grant
  -- everything it used to.
  for pol in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename = any (
        array(select unnest(plain[:][1:1])) || scoring || setup || gameplay
          || array['games']
      )
  loop
    execute format('drop policy %I on public.%I;', pol.policyname, pol.tablename);
  end loop;

  foreach entry slice 1 in array plain
  loop
    tbl  := entry[1];
    perm := entry[2];

    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using ((select public.has_permission(%L)));',
      tbl || '_read', tbl, perm || '.read'
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated '
      'with check ((select public.has_permission(%L)));',
      tbl || '_insert', tbl, perm || '.create'
    );
    execute format(
      'create policy %I on public.%I for update to authenticated '
      'using ((select public.has_permission(%L))) '
      'with check ((select public.has_permission(%L)));',
      tbl || '_update', tbl, perm || '.update', perm || '.update'
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated '
      'using ((select public.has_permission(%L)));',
      tbl || '_delete', tbl, perm || '.delete'
    );
  end loop;

  foreach tbl in array scoring
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using ((select public.has_permission(''boardgames.read'')));',
      tbl || '_read', tbl
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated '
      'with check ((select public.has_permission(''boardgames.updateScoring'')));',
      tbl || '_insert', tbl
    );
    execute format(
      'create policy %I on public.%I for update to authenticated '
      'using ((select public.has_permission(''boardgames.updateScoring''))) '
      'with check ((select public.has_permission(''boardgames.updateScoring'')));',
      tbl || '_update', tbl
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated '
      'using ((select public.has_permission(''boardgames.updateScoring'')));',
      tbl || '_delete', tbl
    );
  end loop;

  foreach tbl in array setup || gameplay
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated '
      'using ((select public.has_permission(''games.read'')));',
      tbl || '_read', tbl
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated '
      'with check (%s);',
      tbl || '_insert', tbl,
      case when tbl = any (setup)
        then '(select public.has_permission(''games.create'')) or ' || by_status
        else by_status
      end
    );
    execute format(
      'create policy %I on public.%I for update to authenticated '
      'using (%s) with check (%s);',
      tbl || '_update', tbl, by_status, by_status
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated '
      'using (%s);',
      tbl || '_delete', tbl, by_status
    );
  end loop;
end;
$$;

-- `games` decides on its own column. The USING clause reads the row as it is
-- *before* the write, which is what makes ending a game work: the row is still
-- ongoing when the permission is checked, so `games.updateLive` covers the last
-- act of the evening. The WITH CHECK only asks for one of the two, because it
-- sees the new row and would otherwise demand `games.updateDone` from the player
-- who just finished his game.
--
-- Read the other way round, it holds too: with `games.updateDone` alone you may
-- reopen a finished game, and from that moment every further edit asks
-- `games.updateLive` — no way in through the back door.
create policy games_read on public.games
  for select to authenticated
  using ((select public.has_permission('games.read')));

create policy games_insert on public.games
  for insert to authenticated
  with check ((select public.has_permission('games.create')));

create policy games_update on public.games
  for update to authenticated
  using (
    case when status = 'ongoing'
      then (select public.has_permission('games.updateLive'))
      else (select public.has_permission('games.updateDone'))
    end
  )
  with check (
    (select public.has_permission('games.updateLive'))
    or (select public.has_permission('games.updateDone'))
  );

create policy games_delete on public.games
  for delete to authenticated
  using ((select public.has_permission('games.delete')));

-- The fiche and the barème live in the same row, and a policy cannot see which
-- column moved — so the split is enforced by trigger, on the diff.
--
-- The column list names the *fiche*, not the barème, on purpose: everything not
-- listed counts as scoring. A column added by a later migration then falls under
-- the stricter permission by default instead of quietly escaping the guard, and
-- the day somebody forgets to update this list the failure is « refused », not
-- « allowed ».
create function public.enforce_boardgame_scoring_permission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  identity constant text[] := array[
    'id', 'name', 'logo_url', 'min_players', 'max_players', 'rec_min_players',
    'rec_max_players', 'kind', 'avg_duration_min', 'tags', 'created_at',
    'is_active'
  ];
  -- Flipped by `mark_boardgame_has_games` when a game is created — a side
  -- effect of playing, not an edit of the game. It has to sit outside BOTH
  -- comparisons: counted as fiche it would make « lancer la première partie
  -- d'un jeu » ask for `boardgames.update`, and counted as barème it would ask
  -- for something worse.
  side_effects constant text[] := array['has_games'];
  before_row constant jsonb := to_jsonb(old);
  after_row  constant jsonb := to_jsonb(new);
begin
  -- A hand on the database is not the application; migrations and seeds write
  -- both halves without asking anybody's permission.
  if current_setting('role', true) is distinct from 'authenticated' then
    return new;
  end if;

  -- Strip the fiche and what remains is the barème.
  if before_row - identity - side_effects
    is distinct from after_row - identity - side_effects
    and not public.has_permission('boardgames.updateScoring')
  then
    raise exception 'le barème d''un jeu demande la permission « boardgames.updateScoring »'
      using errcode = 'insufficient_privilege';
  end if;

  if (select before_row - array(
        select k from jsonb_object_keys(before_row) k where k <> all (identity)
      ))
    is distinct from
    (select after_row - array(
        select k from jsonb_object_keys(after_row) k where k <> all (identity)
      ))
    and not public.has_permission('boardgames.update')
  then
    raise exception 'la fiche d''un jeu demande la permission « boardgames.update »'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger boardgames_scoring_permission
  before update on public.boardgames
  for each row execute function public.enforce_boardgame_scoring_permission();

-- Both halves of the row are reachable; the trigger above says which one you
-- actually moved.
drop policy if exists boardgames_update on public.boardgames;

create policy boardgames_update on public.boardgames
  for update to authenticated
  using (
    (select public.has_permission('boardgames.update'))
    or (select public.has_permission('boardgames.updateScoring'))
  )
  with check (
    (select public.has_permission('boardgames.update'))
    or (select public.has_permission('boardgames.updateScoring'))
  );

-- A player is never really deleted once he has played; `is_active` is how he
-- leaves the table. Taking somebody out of every future selection is not the
-- same act as fixing a typo in his name, so it is not the same permission
-- (owner, 2026-08-14) — and once again the two live in the same row, so the
-- line is drawn on the diff rather than by a policy.
create function public.enforce_player_disable_permission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('role', true) is distinct from 'authenticated' then
    return new;
  end if;

  if new.is_active is distinct from old.is_active
    and not public.has_permission('players.disable')
  then
    raise exception 'activer ou désactiver un joueur demande la permission « players.disable »'
      using errcode = 'insufficient_privilege';
  end if;

  -- `has_played` is flipped by the application as a side effect of playing, not
  -- as an edit of the player, so it rides along with `is_active` rather than
  -- asking for `players.update`.
  if to_jsonb(new) - array['is_active', 'has_played']
    is distinct from to_jsonb(old) - array['is_active', 'has_played']
    and not public.has_permission('players.update')
  then
    raise exception 'modifier un joueur demande la permission « players.update »'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger players_disable_permission
  before update on public.players
  for each row execute function public.enforce_player_disable_permission();

drop policy if exists players_update on public.players;

create policy players_update on public.players
  for update to authenticated
  using (
    (select public.has_permission('players.update'))
    or (select public.has_permission('players.disable'))
  )
  with check (
    (select public.has_permission('players.update'))
    or (select public.has_permission('players.disable'))
  );

-- Extensions themselves arrive by migration and are never written from the app;
-- only the scenarios inside them are authored. Read is still a permission, so a
-- role without the section sees nothing rather than a half-filled screen.
drop policy if exists extensions_read on public.extensions;

create policy extensions_read on public.extensions
  for select to authenticated
  using ((select public.has_permission('extensions.read')));

-- Official scenarios come from the rulebooks: they are seeded, and the app has
-- always refused to create or remove one. The permission is layered on top of
-- that guard, never in place of it — « may delete » has always meant « may
-- delete what is deletable ».
drop policy if exists extension_scenarios_read   on public.extension_scenarios;
drop policy if exists extension_scenarios_insert on public.extension_scenarios;
drop policy if exists extension_scenarios_update on public.extension_scenarios;
drop policy if exists extension_scenarios_delete on public.extension_scenarios;

create policy extension_scenarios_read on public.extension_scenarios
  for select to authenticated
  using ((select public.has_permission('extensions.read')));

create policy extension_scenarios_insert on public.extension_scenarios
  for insert to authenticated
  with check (not is_official and (select public.has_permission('extensions.create')));

create policy extension_scenarios_update on public.extension_scenarios
  for update to authenticated
  using ((select public.has_permission('extensions.update')))
  with check ((select public.has_permission('extensions.update')));

create policy extension_scenarios_delete on public.extension_scenarios
  for delete to authenticated
  using (not is_official and (select public.has_permission('extensions.delete')));

-- A retour is what somebody thought at the time; it is never rewritten, only
-- filed and eventually cleared. Hence no update policy — the absence is the
-- rule, which is why `feedback.update` is absent from the catalogue too.
drop policy if exists feedback_authenticated_read   on public.feedback;
drop policy if exists feedback_authenticated_insert on public.feedback;

create policy feedback_read on public.feedback
  for select to authenticated
  using ((select public.has_permission('feedback.read')));

create policy feedback_insert on public.feedback
  for insert to authenticated
  with check ((select public.has_permission('feedback.create')));

create policy feedback_delete on public.feedback
  for delete to authenticated
  using ((select public.has_permission('feedback.delete')));
