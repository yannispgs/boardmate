-- Scoring. How a boardgame is scored is inherent to the game (Catan is a race
-- to a points target counted throughout, Wingspan tallies only at the end,
-- party games not at all), so the spec lives on the boardgame — authored as
-- data like config templates. NULL = the game isn't scored.
--   { timing: "final" | "live", entry: "total",
--     winCondition: { type: "highest" | "lowest" | "threshold", field? } }
alter table public.boardgames add column scoring jsonb;

-- Per-player score (NULL for unscored games; live-updated or entered at the end).
alter table public.game_players add column score int;

-- Catan: live scoring, first to reach the config's `pointsToWin` wins.
update public.boardgames
set scoring = '{
  "timing": "live",
  "entry": "total",
  "winCondition": { "type": "threshold", "field": "pointsToWin" }
}'::jsonb
where id = '78047bc0-5293-4787-be48-ba7339d48c2d';
