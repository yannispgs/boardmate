-- How long the play screen holds the clock on a stage change, as a config
-- field, so the wait is a setting per game instead of a constant in the code.
--
-- The card announcing a new generation / manche is the step that starts that
-- stage's clock: until somebody taps it, the clock is frozen, so nobody is
-- charged for the seconds between the change and the moment the table looked
-- up. This is the ceiling on that wait — after it, the app starts the turn on
-- its own rather than record a turn of nothing.
--
-- Only the two games that announce a stage get the field: Terraforming Mars
-- (generations, which end when the last player passes) and Wingspan (manches
-- laid out on a calendar). Odin closes its manche by hand, so it is announced
-- out loud before the screen ever hears about it, and every other game has no
-- stage at all — the field would be a row in their editor that does nothing.
--
-- A minute each, which is also the app's fallback: a game configured before
-- this field existed behaves exactly as one configured after it. The bounds are
-- re-applied in code (10 s – 300 s), because both ends are a bug — no wait puts
-- the seconds back on the first player, no ceiling records him none at all.
--
-- Each label uses the game's own word for a stage, like the rest of its screens.
-- Idempotent: skips a template that already carries the key.

-- Terraforming Mars: generations.
update public.config_templates t
set fields = t.fields || '[
    { "key": "stageHoldS", "label": "Attente au changement de génération (s)", "type": "integer", "min": 10, "max": 300, "default": 60 }
  ]'::jsonb
from public.boardgames b
where t.boardgame_id = b.id
  and b.name = 'Terraforming Mars'
  and not (t.fields @> '[{"key": "stageHoldS"}]'::jsonb);

-- Wingspan: manches.
update public.config_templates t
set fields = t.fields || '[
    { "key": "stageHoldS", "label": "Attente au changement de manche (s)", "type": "integer", "min": 10, "max": 300, "default": 60 }
  ]'::jsonb
from public.boardgames b
where t.boardgame_id = b.id
  and b.name = 'Wingspan'
  and not (t.fields @> '[{"key": "stageHoldS"}]'::jsonb);
