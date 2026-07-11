-- Per-round turn-time schedule as config fields, so each game has a default
-- barème (base + step per round, capped) that's editable at launch and stored
-- in the config values. `turnStepS = 0` means a constant timer.
--
-- Catan already has a config template → append the three fields (idempotent:
-- skips if `turnBaseS` is already there). Cascadia has none yet → create one
-- carrying just the schedule. Catan grows steadily; Cascadia grows more gently
-- (owner's call).

-- Catan: 45 s + 5 s / tour, capped at 180 s.
update public.config_templates t
set fields = t.fields || '[
    { "key": "turnBaseS", "label": "Durée de base (s)", "type": "integer", "min": 5, "max": 600, "default": 45 },
    { "key": "turnStepS", "label": "Augmentation par tour (s)", "type": "integer", "min": 0, "max": 120, "default": 5 },
    { "key": "turnMaxS", "label": "Durée max (s)", "type": "integer", "min": 5, "max": 900, "default": 180 }
  ]'::jsonb
from public.boardgames b
where t.boardgame_id = b.id
  and b.name = 'Catan'
  and not (t.fields @> '[{"key": "turnBaseS"}]'::jsonb);

-- Cascadia: 45 s + 8 s / tour (gentler), capped at 150 s.
insert into public.config_templates (boardgame_id, fields)
select b.id, '[
    { "key": "turnBaseS", "label": "Durée de base (s)", "type": "integer", "min": 5, "max": 600, "default": 45 },
    { "key": "turnStepS", "label": "Augmentation par tour (s)", "type": "integer", "min": 0, "max": 120, "default": 8 },
    { "key": "turnMaxS", "label": "Durée max (s)", "type": "integer", "min": 5, "max": 900, "default": 150 }
  ]'::jsonb
from public.boardgames b
where b.name = 'Cascadia'
on conflict (boardgame_id) do nothing;
