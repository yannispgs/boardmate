-- Papayoo, and the games a turn goes by too fast to time.
--
-- ⚠️ Not replayable: a plain insert, and `boardgames.name` is unique.
--
-- Papayoo is a trick-taking card game the table plays one hand at a time: a
-- game IS a hand. Nobody wants to walk back through the new-game funnel between
-- two of them, so it is recorded the plainest way there is — the final totals,
-- typed once at the end, and nothing else. No manche, no lap, no countdown.
--
-- What it does have is a total: the twenty payoos and the papayoo card are all
-- in play every hand, whatever the number of players, and they are worth 250
-- points between them. Final scores adding up to anything else have been
-- misheard, which is what `scoring.totalSum` makes the score form enforce.
--
-- Two things follow for every game, not just this one:
--   is_timed       — whether the app runs a clock on the turns at all
--   scoring.totalSum — the points the whole table always shares out
-- Until now the only game with no clock was Odin, and it got away without one
-- as a side effect of being counted manche by manche. That was never the
-- reason: a trick is laid down in two seconds, and a countdown on it measures
-- nothing. So the reason is written down.

alter table public.boardgames
  add column is_timed boolean not null default true;

comment on column public.boardgames.is_timed is
  'Whether the app runs a clock on this game''s turns. False for the games a '
  'turn goes by too fast to time (a trick-taking card game) or where the table '
  'decides when to move on (a game counted manche by manche): no play block, no '
  'turn recorded, so every per-turn figure is absent rather than zero.';

comment on column public.boardgames.scoring is
  'ScoringSpec — { "timing", "entry", "stopCondition", "winCondition", '
  '"allowNegative", "startScore", "minScore", "sheet", "totalSum", "tieBreak" }. '
  '"totalSum" is the points the whole table always shares out (Papayoo: 250); '
  'the end-of-game form refuses totals adding up to anything else.';

-- Odin already showed no countdown, but only as a side effect of being counted
-- manche by manche. Now that the reason has a column of its own, it says so.
update public.boardgames
set is_timed = false
where stages ->> 'advance' = 'manual';

-- No stages, no config template: the play screen is the score sheet and the
-- button that opens it. The smallest total wins — the points collected are
-- penalties, not a prize.
insert into public.boardgames (
  name,
  kind,
  min_players,
  max_players,
  avg_duration_min,
  tags,
  turn_mode,
  is_timed,
  scoring
)
values (
  'Papayoo',
  'competitive',
  3,
  8,
  15,
  array['cartes', 'plis'],
  'sequential',
  false,
  $json${
    "timing": "final",
    "entry": "total",
    "stopCondition": null,
    "winCondition": { "type": "lowest" },
    "totalSum": 250
  }$json$::jsonb
);
