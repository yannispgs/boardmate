-- Smallworld, which the app has been playing for weeks without ever declaring.
--
-- The owner entered it by hand in production on 2026-08-15 and it was copied
-- into dev the day after — but only the boardgame row, never its configuration
-- template. So dev, every preview built from it, and every fresh database (the
-- local stack the e2e suite runs on) offer a Smallworld game with no « Durée de
-- base (s) » field, while production has one. This writes the game down where
-- the other eleven are written down, so the three environments finally agree.
--
-- Everything below is read off the production row, not invented: 2-5 players,
-- nine rounds played in seats, one total entered at the end and the highest
-- wins. The two hosted databases already hold it, so both guards below find
-- their row and change nothing there; the insert only ever fires on a database
-- that does not have the game yet.
--
-- ⚠️ Keyed on the NAME, never on the id. The two hosted rows were created
-- independently and carry DIFFERENT primary keys (dev `c21d7682-…`, prod
-- `cc05cc8a-…`), and production's has real games hanging off it. A seeded id
-- would collide with `boardgames_name_key` on one side and orphan history on
-- the other.
insert into public.boardgames
  (name, kind, min_players, max_players, turn_mode, round_limit,
   is_timed, track_seat_stats, tags, scoring)
select
  'Smallworld',
  'competitive',
  2,
  5,
  'sequential',
  -- The box is played over a fixed number of rounds that depends on the number
  -- of players; nine is the count the owner set for the table he plays it at.
  9,
  true,
  -- Who sat where matters: the map is shared and the seats are not equivalent.
  true,
  array[]::text[],
  '{
    "timing": "final",
    "entry": "total",
    "winCondition": { "type": "highest" },
    "allowNegative": false,
    "stopCondition": null
  }'::jsonb
where not exists (
  select 1 from public.boardgames where name = 'Smallworld'
);

-- Turn timer: a plain base duration, with neither the per-round increase nor
-- the ceiling the longer games carry. A turn is one conquest and one scoring,
-- so it does not stretch as the game goes on the way Terraforming Mars' does.
insert into public.config_templates (boardgame_id, fields)
select b.id, '[
    { "key": "turnBaseS", "label": "Durée de base (s)", "type": "integer", "min": 5, "max": 600, "default": 120 }
  ]'::jsonb
from public.boardgames b
where b.name = 'Smallworld'
  and not exists (
    select 1 from public.config_templates c where c.boardgame_id = b.id
  );
