-- Symbiose counted card by card, the way its printed pad lays the mare out.
--
-- A player's mare is 8 cards in 2 rows of 4: the left column scores against
-- the left neighbour, the two centre columns against the player's own mare,
-- the right column against the right neighbour. The game was entered by hand
-- in the editor with one sheet line per zone — left, centre, right — and the
-- table added each zone's cards up in its head before typing it in.
--
-- `scoring.grid` lays that same sheet out as the mare instead: a box per card,
-- the boxes of each zone adding up to its line, the left and right zones
-- outlined to mark them off. Only the lines are recorded, so the parties
-- already in the books keep their place in the stats.
--
-- Read off the sheet as it stands — its first, second and third line — rather
-- than by key: the game was created in the app, and its keys are its own. A
-- base that has no Symbiose, or whose sheet has moved away from three lines,
-- is left alone.

comment on column public.boardgames.scoring is
  'ScoringSpec — { "timing", "entry", "stopCondition", "winCondition", '
  '"allowNegative", "startScore", "minScore", "sheet", "grid", "totalSum", '
  '"tieBreak" }. "grid" ({ "rows", "zones": [{ "category", "columns", '
  '"framed" }] }) lays a category sheet out as the cards lie on the table, '
  'each zone''s boxes adding up to its sheet line (Symbiose).';

update public.boardgames
set scoring = scoring || jsonb_build_object(
  'grid', jsonb_build_object(
    'rows', 2,
    'zones', jsonb_build_array(
      jsonb_build_object(
        'category', scoring -> 'sheet' -> 0 ->> 'key',
        'columns', 1,
        'framed', true
      ),
      jsonb_build_object(
        'category', scoring -> 'sheet' -> 1 ->> 'key',
        'columns', 2
      ),
      jsonb_build_object(
        'category', scoring -> 'sheet' -> 2 ->> 'key',
        'columns', 1,
        'framed', true
      )
    )
  )
)
where name = 'Symbiose'
  and scoring ->> 'entry' = 'categories'
  and jsonb_array_length(scoring -> 'sheet') = 3;
