-- Papayoo, and the second family of card game counted manche by manche.
--
-- ⚠️ Not replayable: a plain insert, and `boardgames.name` is unique.
--
-- Odin was the first game the app counted that way, and its manche carried two
-- rules written as if they were universal: exactly one player ends it at 0 (he
-- is the one who emptied his hand), and nobody can be caught with more than a
-- full hand. Papayoo is counted the same way and breaks both. Nobody goes out:
-- the payoo cards are shared out trick by trick, so a manche can end with three
-- players at 0 or with none, and one unlucky player can collect the lot.
--
-- What Papayoo does have instead is a total: the twenty payoos and the papayoo
-- card are all in play every manche, whatever the number of players, and they
-- are worth 250 points between them. A manche adding up to anything else has
-- been misheard — which is a far stronger check than Odin's, and the one the
-- score form now enforces.
--
-- So the two rules move out of the code and into the game's own `stages`:
--   singleExit     — one player, and one only, ends a manche at 0 (Odin)
--   stageTotal     — a manche always hands out exactly this many points
--   stagesPerPlayer — the game lasts this many manches per player at the table
-- and nothing is timed here either: a trick-taking game records no turn, so the
-- play screen shows no countdown and Papayoo carries no config template at all.

-- Odin's rule was assumed by the code until now, so it has to be written down
-- before the code stops assuming it — otherwise a manche nobody went out of
-- would suddenly be accepted.
update public.boardgames
set stages = stages || '{ "singleExit": true }'::jsonb
where stages ->> 'advance' = 'manual';

comment on column public.boardgames.stages is
  'StageSpec — { "label", "advance": "pass" | "schedule" | "manual", '
  '"schedule": int[], "maxPoints": int, "singleExit": bool, "stageTotal": int, '
  '"stagesPerPlayer": int }. The last three are how a manche is checked and how '
  'many of them a game runs. Null for a game turning in plain laps.';

-- 60 cards dealt out in tricks: the number of tricks in a manche is 60 divided
-- by the number of players, which nothing here needs to know — no turn is
-- timed, no lap is counted, and the manche is the game's only unit of progress.
-- What the app does need is when to stop, and this table plays one manche per
-- player.
insert into public.boardgames (
  name,
  kind,
  min_players,
  max_players,
  avg_duration_min,
  tags,
  turn_mode,
  scoring,
  stages
)
values (
  'Papayoo',
  'competitive',
  3,
  8,
  30,
  array['cartes', 'plis'],
  'sequential',
  -- No stop condition: nothing about the score ends the game, the count of
  -- manches does. The smallest total wins, as at Odin — the points collected
  -- are penalties, not a prize.
  '{
    "timing": "final",
    "entry": "total",
    "stopCondition": null,
    "winCondition": { "type": "lowest" }
  }'::jsonb,
  -- `maxPoints` is the whole pile: one player taking every payoo scores 250 on
  -- his own, so nothing below that could be flagged as a miscount.
  '{
    "label": "Manche",
    "advance": "manual",
    "maxPoints": 250,
    "stageTotal": 250,
    "stagesPerPlayer": 1
  }'::jsonb
);
