-- A fixed-length game: it ends automatically once this many rounds (tours) have
-- been played, then the winner is decided by the game's scoring. Null = no fixed
-- length (the game ends by a score threshold or by hand, as before).
alter table public.boardgames
  add column round_limit int;

-- Cascadia lasts exactly 20 rounds, then points are tallied by category.
update public.boardgames
set round_limit = 20
where name = 'Cascadia';
