-- Games where players do not all get the same number of turns.
--
-- Most games end on a lap boundary, so comparing raw scores is fair. Forêt
-- Mixte doesn't: the game stops the instant the third winter card is drawn,
-- anywhere in the lap, so whoever sits after that player simply never took
-- their last turn. Their score is short of one turn's worth of points and
-- nothing on the recap says so.
--
-- The flag is authored per game rather than guessed from the turn counts: a
-- game that merely happened to end on a whole lap would look "fair" and lose
-- the reading exactly when the owner wants to compare it with another game.
--
-- Display only. It adds a points-per-turn reading and a « dommage pour X »
-- remark on the end-of-game stats; it never touches the winner, the ranking or
-- the tie-break.

alter table public.boardgames
  add column turn_count_varies boolean not null default false;

update public.boardgames
  set turn_count_varies = true
  where lower(name) = 'forêt mixte';
