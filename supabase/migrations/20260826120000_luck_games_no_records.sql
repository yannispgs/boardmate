-- No record to hold at Papayoo or Odin.
--
-- The owner's call (2026-08-26): « Avoir 0 est faisable même en jouant
-- aléatoirement avec de la chance. […] Pas de réel record à faire sur ce jeu.
-- Pareil pour Odin d'ailleurs. »
--
-- Both games share out penalty points from a deal nobody chose. A hand where
-- every payoo went somewhere else is a good deal, not a good player, and
-- crowning it « WR4 » tells the table something false about the evening. What
-- does separate the players at these games only appears over a long run — the
-- average total taken, and the share of parties finished at nought — and both
-- already sit on the Statistiques page.
--
-- Catan carries the same flag since 20260817120000, for the other reason: its
-- total is decided by the scenario rather than by luck. Same silence, different
-- cause, which is why the column comment now spells out both.
--
-- ⚠️ What this does NOT switch off: the mark the evening's facts read (« passe
-- les 200 points »). That figure is the upper quartile of every score ever
-- posted on the game, so it is a distribution, not a record — the very kind of
-- number a luck-driven game is best read by. It stopped consulting this flag in
-- the same change.
--
-- ⚠️ Merged in with `||` rather than written as a fresh `scoring` object: these
-- rows are hand-edited in the game editor on prod, and rewriting the column
-- would silently drop whatever was typed there (the trap Papayoo and Splendor
-- both walked into). `where scoring is not null` guards the merge — a game that
-- keeps no score has no record to hold in the first place.

update public.boardgames
set scoring = scoring || '{"trackRecords": false}'::jsonb
where scoring is not null
  and name in ('Papayoo', 'Odin');

comment on column public.boardgames.scoring is
  'ScoringSpec — { "timing", "entry", "stopCondition", "winCondition", '
  '"allowNegative", "startScore", "minScore", "sheet", "totalSum", "tieBreak", '
  '"playerCountSensitive", "trackRecords" }. "totalSum" is the points the whole '
  'table always shares out (Papayoo: 250); the end-of-game form refuses totals '
  'adding up to anything else. "playerCountSensitive" means scores only compare '
  'between tables of the same size, so best-score marks read « PB4 »/« WR4 ». '
  '"trackRecords" false drops those marks entirely, for a game where one figure '
  'owes more to the draw than to the play — the setup decides it (Catan: the '
  'scenario) or luck does (Papayoo, Odin: the deal). It silences the crowning '
  'only; averages, zero-finish rates and the evening''s quartile mark all stay.';
