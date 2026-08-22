-- Splito is a hybrid game, not a competitive one: the points are scored on the
-- two piles a player shares with the seats flanking him, so a pile is never
-- entirely his own doing. It was seeded as `competitive` in
-- 20260711180000_simultaneous_play_splito.sql, and set to `hybrid` by hand in
-- the editor afterwards — which reached the dev project only. This carries the
-- correction to the projects the hand edit never touched (prod and local), so
-- the three of them finally say the same thing.
--
-- Idempotent: replaying it updates no row. It also names the value it replaces,
-- so a game deliberately left competitive elsewhere is never swept up.

update public.boardgames
set kind = 'hybrid'
where name = 'Splito' and kind = 'competitive';
