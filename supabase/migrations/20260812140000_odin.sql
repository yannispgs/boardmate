-- Odin: a card game counted in manches, and the third way a stage can end.
--
-- Terraforming Mars closes a generation when the last player passes; Wingspan
-- closes a manche after a counted number of laps. Odin closes one when somebody
-- empties his hand — the table says so, nothing counts it, and nobody knows how
-- many manches the game will run. Hence `advance: "manual"`: such a stage is the
-- game's only unit of progress, it is scored as it closes, and those scores are
-- the game's whole score.
--
-- The end condition is the mirror image of Catan's. Reaching the target does not
-- win the game, it STOPS it — and the player who kept the fewest points then
-- takes it. That is what `winCondition.winner` says: the threshold decides WHEN,
-- the direction decides WHO.

insert into public.boardgames (
  name,
  kind,
  min_players,
  max_players,
  turn_mode,
  scoring,
  stages
)
values (
  'Odin',
  'competitive',
  2,
  6,
  'sequential',
  '{
    "timing": "final",
    "entry": "total",
    "winCondition": {
      "type": "threshold",
      "field": "pointsToEnd",
      "winner": "lowest"
    }
  }'::jsonb,
  '{ "label": "Manche", "advance": "manual" }'::jsonb
);

comment on column public.boardgames.stages is
  'StageSpec — { "label", "advance": "pass" | "schedule" | "manual", '
  '"schedule": int[] }. Null for a game turning in plain laps.';

-- The only thing there is to set up: the total that stops the game. 15 by the
-- book, editable per game like Catan's « points pour gagner » — a table that
-- wants a short game lowers it instead of waiting for a new deployment.
--
-- No turn-time schedule: nothing is timed in a game with no turns to time, so
-- the play screen shows no countdown and the template carries no `turnBaseS`.
insert into public.config_templates (boardgame_id, fields)
select id, '[
    {
      "key": "pointsToEnd",
      "label": "Points qui arrêtent la partie",
      "type": "integer",
      "min": 5,
      "max": 100,
      "default": 15
    }
  ]'::jsonb
from public.boardgames
where name = 'Odin'
on conflict (boardgame_id) do nothing;
