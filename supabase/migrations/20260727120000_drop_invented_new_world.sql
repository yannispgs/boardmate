-- "Le Nouveau Monde" was never a Marins scenario: it was invented to give the
-- generator something to draw while the format was being designed. Now that
-- scenarios are authored in the app and drawn from `board_spec`, a scenario the
-- rulebook does not know has no place in the list — and it carries no map of
-- its own, so nothing is lost with it.
--
-- A scenario already played is protected by the games that reference it, so the
-- delete is scoped to the untouched row.
delete from public.extension_scenarios
where board_key = 'new-world'
  and not exists (
    select 1 from public.game_extensions
    where game_extensions.scenario_id = extension_scenarios.id
  );
