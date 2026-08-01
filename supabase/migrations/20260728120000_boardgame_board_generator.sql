-- Which board generator a game is played on, when it is played on one.
--
-- The generators are screens of their own, one per game we have written the
-- rules of a board for; nothing tied them to the game they generate for. The
-- new-game funnel needs that tie: once the players are seated and the scenario
-- picked, it offers the board the game will actually be set up on, and it can
-- only do that if the game says which generator draws it.
--
-- A plain text handle rather than a foreign key: the generators live in the
-- code, not in a table, and a row cannot point at a screen.

alter table public.boardgames
  add column board_generator text;

-- Catan is the one game with a generator today; its Marins scenarios ride on
-- the same handle, the extension being what turns a base board into a map.
update public.boardgames
  set board_generator = 'catan'
  where lower(name) = 'catan';
