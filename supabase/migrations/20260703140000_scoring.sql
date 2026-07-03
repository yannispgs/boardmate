-- Scoring. How a boardgame is scored is inherent to the game (Catan scores
-- throughout, Wingspan only at the end, party games not at all), so the spec
-- lives on the boardgame — authored as data like config templates. NULL = the
-- game isn't scored. v1 handles `{"timing":"final","entry":"total",...}`:
-- a single total entered per player at the end.
alter table public.boardgames add column scoring jsonb;

-- Per-player final score (NULL until entered / for unscored games).
alter table public.game_players add column score int;

-- Catan: final total, highest wins. Interim — it becomes live scoring once
-- in-game score tracking exists (a later brick); using it here gives the flow a
-- real, playable game to exercise.
update public.boardgames
set scoring = '{"timing":"final","entry":"total","winnerBy":"highest"}'::jsonb
where id = '78047bc0-5293-4787-be48-ba7339d48c2d';
