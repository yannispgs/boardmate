-- Every policy in the schema, rewritten to ask a permission instead of asking
-- « are you logged in ».
--
-- The mapping below is the whole review surface: one line per table, naming the
-- permission family that governs it. Everything else is mechanical — four
-- policies per table, one per SQL command, each calling `has_permission` wrapped
-- in a `(select …)` so Postgres evaluates it once per statement instead of once
-- per row.
--
-- Tables are grouped by the section the owner sees in the grid. A game's config
-- and its template travel with the game itself: editing a scoring spec and
-- editing the fields that feed it are the same act, and splitting them would let
-- somebody change what a game asks for without being able to change what it
-- does with the answers.
--
-- Two tables stay out of the loop and are written by hand below:
-- `extension_scenarios`, which already refuses to touch official scenarios, and
-- `feedback`, which nobody may edit after the fact.
--
-- Not touched: `auth_rate_limits`, which carries no policy at all and is reached
-- only by the service role.

do $$
declare
  mapping constant text[][] := array[
    -- Jeux & barèmes
    ['boardgames',        'boardgames'],
    ['config_templates',  'boardgames'],
    ['configs',           'boardgames'],
    -- FAQ
    ['faq_entries',       'faq'],
    -- Parties
    ['games',             'games'],
    ['game_players',      'games'],
    ['game_turns',        'games'],
    ['game_stages',       'games'],
    ['game_stage_scores', 'games'],
    ['game_stage_passes', 'games'],
    ['game_milestones',   'games'],
    ['game_extensions',   'games'],
    ['score_events',      'games'],
    ['dice_rolls',        'games'],
    -- Joueurs
    ['players',           'players']
  ];
  entry text[];
  tbl   text;
  perm  text;
  pol   record;
begin
  foreach entry slice 1 in array mapping
  loop
    tbl  := entry[1];
    perm := entry[2];

    -- Drop whatever was there rather than assume its name: some tables carry a
    -- single `for all` policy from the initial schema, others four named ones
    -- added later, and a stale permissive policy left behind would grant
    -- everything it used to.
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tbl
    loop
      execute format('drop policy %I on public.%I;', pol.policyname, tbl);
    end loop;

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
end;
$$;

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
