-- Parties entered through « Ajouter une partie terminée » were stamped as
-- starting the moment they were typed in, while ending on the evening they were
-- actually played. The two are months apart on a history caught up in one
-- sitting, so the row read as starting long after it finished.
--
-- It was never a figure anybody could see as wrong: « La partie » sums the turn
-- log and never reads `ended_at - started_at`, so no duration on screen came
-- from this. What did come from it is where the party is filed — « Parties »
-- prints and filters on `started_at` — so a game played last spring sat on the
-- day of the data entry, and a dozen of them sat on top of each other there.
--
-- The repair sets the start to the end, which is what the adapter now writes:
-- the table played it away from the app and nobody wrote down how long it took,
-- so a span invented here would be a measurement the averages would trust.
--
-- Only rows that are provably inverted are touched. A party whose start is at
-- or before its end has nothing wrong with it, whatever else it may lack.
update games
set started_at = ended_at
where status = 'ended'
  and ended_at is not null
  and started_at > ended_at;
