-- Best scores: whose record a party breaks, and what a record is worth.
--
-- The end of a game now says, next to a player's line, whether the score he
-- just posted is his own best on that game (« PB ») or the best anyone has ever
-- posted on it (« WR »). Two things about a game decide how — and whether — that
-- reads, and neither could be guessed from the numbers:
--
--   scoring.playerCountSensitive — the scale moves with the number of players,
--     so scores only compare between tables of the same size. Papayoo shares
--     out the same 250 points whoever is playing: the average falls from 83 at
--     three players to 31 at eight, and a record pooled across every table
--     would simply name the biggest one that ever sat down. The mark then
--     carries the size it is held at — « WR4 » — so it can't be read as a
--     figure the whole game answers to.
--   scoring.trackRecords — whether a best score means anything here at all.
--
-- The five games whose scale really moves are the owner's own call (2026-08-17)
-- and the list is his: Catan, Papayoo, Odin, Forêt Mixte, Terraforming Mars.
-- Splito was considered and left out — it is scored on ADJACENT pairs, so one
-- more player adds one more pair, not a quadratic pile of them.
--
-- Catan is the one game with no record at all: its total depends on the
-- scenario being played (the Seafarers ones above all), so its « record » would
-- only ever mark the most generous map — not a performance. It keeps the
-- sensitivity flag, which is about comparing distributions, not about crowning.
--
-- ⚠️ Both flags are merged in with `||` rather than written with a fresh
-- `scoring` object. These rows have been hand-edited in the game editor on
-- prod, and rewriting the column would silently drop whatever was typed there
-- (the trap Papayoo and Splendor both walked into). `where scoring is not null`
-- guards the merge: a game that keeps no score has no record to hold.

update public.boardgames
set scoring = scoring || '{"playerCountSensitive": true}'::jsonb
where scoring is not null
  and name in (
    'Catan',
    'Papayoo',
    'Odin',
    'Forêt Mixte',
    'Terraforming Mars'
  );

update public.boardgames
set scoring = scoring || '{"trackRecords": false}'::jsonb
where scoring is not null
  and name = 'Catan';

comment on column public.boardgames.scoring is
  'ScoringSpec — { "timing", "entry", "stopCondition", "winCondition", '
  '"allowNegative", "startScore", "minScore", "sheet", "totalSum", "tieBreak", '
  '"playerCountSensitive", "trackRecords" }. "totalSum" is the points the whole '
  'table always shares out (Papayoo: 250); the end-of-game form refuses totals '
  'adding up to anything else. "playerCountSensitive" means scores only compare '
  'between tables of the same size, so best-score marks read « PB4 »/« WR4 ». '
  '"trackRecords" false drops those marks entirely, for a game whose total owes '
  'more to the setup than to the play (Catan: the scenario).';
