-- Authored Catan Marins scenarios: a scenario can now carry the full board it
-- is drawn from, so a new one is authored in the app (the scenario editor)
-- instead of being coded and deployed.
--
-- The blob is the `ScenarioSpec` of src/lib/catan/scenario-spec.ts: a canvas of
-- zones (cells + tile bag + token bag), static tiles and harbour bags, one board
-- per player count. It is written by the client, so it is re-validated with Zod
-- on every read — the column is storage, never a trust boundary.
--
-- `board_key` stays for the scenarios the generator ships in code; a scenario
-- carries one or the other.

alter table public.extension_scenarios
  add column board_spec jsonb;

-- A stable handle on an extension the code itself has to recognise: the board
-- generator draws Catan - Marins scenarios and the editor writes into it, so it
-- can't be found by a name the owner is free to change, nor by an id that only
-- exists because a seed happened to mint it.
alter table public.extensions
  add column key text unique;

update public.extensions set key = 'catan-marins' where name = 'Catan - Marins';

-- Scenarios become user-authored content: the four allowed accounts may write
-- them. Reading stays as it was (authenticated only; anon has no policy, so RLS
-- denies it whatever the grant says).
create policy extension_scenarios_insert on public.extension_scenarios
  for insert to authenticated with check (true);
create policy extension_scenarios_update on public.extension_scenarios
  for update to authenticated using (true) with check (true);

-- Deleting a scenario still referenced by a played game is refused by the
-- game_extensions foreign key (on delete restrict) — history is preserved.
create policy extension_scenarios_delete on public.extension_scenarios
  for delete to authenticated using (true);

-- Hosted projects don't inherit the local stack's permissive grants: without
-- this the policies above would never even be reached.
grant insert, update, delete on public.extension_scenarios to authenticated;
