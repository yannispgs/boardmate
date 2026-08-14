-- Splendor, and the second way a score target can stop a game.
--
-- ⚠️ Not replayable: a plain insert, and `boardgames.name` is unique. Production
-- already carries a Splendor entered by hand from the app, which has to be
-- deleted right before this runs there (nothing points at it: no game, no
-- config, no FAQ entry).
--
-- Until now reaching the target ended the game on the spot: at Catan, getting
-- to 10 points on your own turn IS the victory, and the players sitting after
-- you never get to answer. Splendor gives them that answer — the lap is played
-- out, so everybody has had the same number of turns and whoever is still to
-- play can overtake the leader on his last one. And when it is the LAST player
-- of the lap who reaches the target, the game stops there: nobody is left.
--
-- Hence `stopCondition.timing`, which says when a reached target actually
-- stops the game rather than what stops it. Absent means `immediate`, which is
-- every game we had until today, so nothing already stored has to be rewritten.

comment on column public.boardgames.scoring is
  'ScoringSpec — { "timing", "entry", "stopCondition": { "type": "scoreTarget", '
  '"field", "timing": "immediate" | "roundEnd" } | null, "winCondition": '
  '{ "type": "highest" | "lowest" }, ... }. Stopping and winning are separate '
  'questions: a target ends the game, the direction says who takes it, and the '
  'stop condition''s own timing says whether the lap is played out first. '
  'Null for a game that isn''t scored.';

-- The box says 2 to 4 and about 30 minutes; 3 to 4 players and an hour is what
-- a game actually takes at this table, and the table is the one the averages
-- are compared against.
insert into public.boardgames (
  name,
  kind,
  min_players,
  max_players,
  rec_min_players,
  rec_max_players,
  avg_duration_min,
  tags,
  turn_mode,
  track_seat_stats,
  scoring
)
values (
  'Splendor',
  'competitive',
  2,
  4,
  3,
  4,
  60,
  array['cartes', 'gestion', 'ressources'],
  'sequential',
  -- Playing first is worth something in a race to a fixed total, so the stats
  -- break the results down by seat, as they do for Catan. Purely informative.
  true,
  '{
    "timing": "live",
    "entry": "total",
    "stopCondition": {
      "type": "scoreTarget",
      "field": "pointsToWin",
      "timing": "roundEnd"
    },
    "winCondition": { "type": "highest" },
    "tieBreak": [
      {
        "key": "developmentCards",
        "label": "Le moins de cartes développement achetées",
        "direction": "lowest",
        "source": "ask",
        "help": "Cartes développement achetées (les tuiles nobles ne comptent pas)"
      }
    ]
  }'::jsonb
);

-- Prestige points accumulate as cards are bought and nobles come visiting, so
-- the total only ever goes up: no negative scores, no floor above zero, and
-- nothing to enter at the end — the running total IS the score.
--
-- 15 by the book, editable per game like Catan's « points pour gagner ».
--
-- A constant 30 s timer, i.e. `turnBaseS` alone and no `turnStepS` / `turnMaxS`
-- (as Splito does): a turn here is exactly one action out of four, so it does
-- not get longer as the game fills up the way a Catan turn does.
insert into public.config_templates (boardgame_id, fields)
select id, '[
    {
      "key": "pointsToWin",
      "label": "Points pour gagner",
      "type": "integer",
      "min": 5,
      "max": 40,
      "default": 15
    },
    {
      "key": "turnBaseS",
      "label": "Durée de base (s)",
      "type": "integer",
      "min": 5,
      "max": 600,
      "default": 30
    }
  ]'::jsonb
from public.boardgames
where name = 'Splendor'
on conflict (boardgame_id) do nothing;
