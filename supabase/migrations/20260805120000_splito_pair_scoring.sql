-- Splito is scored on shared piles, not on a total typed in at the end.
--
-- The players sit in a circle and every pile of points is shared by two
-- neighbours; a player's final score is the PRODUCT of the two piles flanking
-- his seat (as the box's own score sheet draws it: one cell per player, an oval
-- straddling each of its borders, a × underneath).
--
-- The end-of-game sheet therefore asks for one number per pile — as many piles
-- as there are players — and multiplies, instead of asking each player for a
-- total he had to work out himself. Each player's two piles are kept in
-- `game_players.score_breakdown` so the recap can show `12 × 7 = 84`.
update public.boardgames
set scoring = scoring || '{"entry": "pairs"}'::jsonb
where name = 'Splito' and scoring is not null;
