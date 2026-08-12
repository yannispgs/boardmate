-- Odin: a card game counted in manches, and the third way a stage can end.
--
-- Terraforming Mars closes a generation when the last player passes; Wingspan
-- closes a manche after a counted number of laps. Odin closes one when somebody
-- empties his hand — the table says so, nothing counts it, and nobody knows how
-- many manches the game will run. Hence `advance: "manual"`: such a stage is the
-- game's only unit of progress, it is scored as it closes, and those scores are
-- the game's whole score.
--
-- Odin is also what splits « what stops the game » from « who wins it ». Until
-- now one `winCondition` answered both, because in every game we had they were
-- the same answer: reach 10 points at Catan and you are the one who ended the
-- game AND the highest total. Reaching 15 at Odin only ends it — the player who
-- stayed lowest takes it. So the two questions now have two fields:
--   stopCondition — when the game ends (a score target, or nothing at all)
--   winCondition  — which end of the range takes it (highest / lowest)
-- and a game where they line up simply says `highest` and stops there.

-- Catan is the other game with a target; it moves to the same two fields, its
-- « highest » being exactly the mirror of Odin's « lowest ». Written against
-- the old shape rather than by name, so nothing that carried it is left behind.
update public.boardgames
set scoring = (scoring - 'winCondition')
  || jsonb_build_object(
       'stopCondition', jsonb_build_object(
         'type', 'scoreTarget',
         'field', scoring -> 'winCondition' ->> 'field'
       ),
       'winCondition', jsonb_build_object(
         'type', coalesce(scoring -> 'winCondition' ->> 'winner', 'highest')
       )
     )
where scoring -> 'winCondition' ->> 'type' = 'threshold';

comment on column public.boardgames.scoring is
  'ScoringSpec — { "timing", "entry", "stopCondition": { "type": "scoreTarget", '
  '"field" } | null, "winCondition": { "type": "highest" | "lowest" }, ... }. '
  'Stopping and winning are separate questions: a target ends the game, the '
  'direction says who takes it. Null for a game that isn''t scored.';

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
    "stopCondition": {
      "type": "scoreTarget",
      "field": "pointsToEnd"
    },
    "winCondition": { "type": "lowest" }
  }'::jsonb,
  -- 9 is the hand you are dealt, and a hand never grows: you lay at least one
  -- card and take at most one back. So nine is the most anyone can still be
  -- holding when a manche ends, and a bigger number is a miscount.
  '{ "label": "Manche", "advance": "manual", "maxPoints": 9 }'::jsonb
);

comment on column public.boardgames.stages is
  'StageSpec — { "label", "advance": "pass" | "schedule" | "manual", '
  '"schedule": int[], "maxPoints": int }. Null for a game turning in plain laps.';

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
