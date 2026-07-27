-- Where a scenario comes from: printed in the Seafarers rulebook, or invented
-- here in the scenario editor. The two are not interchangeable — an official
-- scenario's map can be drawn and corrected, but the scenario itself belongs to
-- the rules, not to the app, so it is never removed.
--
-- The distinction was until now implicit in `board_key`, the handle the board
-- generator used to look a scenario's board up in the code. Scenarios are data
-- now (see 20260726120000_scenario_board_spec), nothing reads that key any
-- more, and its only surviving meaning was "came from the rulebook" — so it
-- becomes the column that says exactly that.

alter table public.extension_scenarios
  add column is_official boolean not null default false;

update public.extension_scenarios
  set is_official = true
  where board_key is not null;

alter table public.extension_scenarios
  drop column board_key;

-- An official scenario is never deleted. RLS filters the rows a delete may
-- reach, so an attempt simply affects nothing — the same shape as the players
-- table, where history outranks tidiness.
drop policy extension_scenarios_delete on public.extension_scenarios;

create policy extension_scenarios_delete on public.extension_scenarios
  for delete to authenticated using (not is_official);

-- The editor only ever authors scenarios of its own: an official one comes from
-- a migration, alongside the rulebook it transcribes.
drop policy extension_scenarios_insert on public.extension_scenarios;

create policy extension_scenarios_insert on public.extension_scenarios
  for insert to authenticated with check (not is_official);
