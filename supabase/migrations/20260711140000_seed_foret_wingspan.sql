-- Two more category-scored games (final scoring, points grouped by category),
-- mirroring Cascadia. Each also gets a config template carrying the per-round
-- turn-time schedule (base + step, capped), with a default barème per game.

-- Forêt Mixte: points from the top / bottom / side cards and the cave.
insert into public.boardgames (name, kind, min_players, max_players, scoring)
values (
  'Forêt Mixte',
  'competitive',
  2,
  4,
  '{
    "timing": "final",
    "entry": "categories",
    "winCondition": { "type": "highest" },
    "sheet": [
      { "key": "cartesHaut", "label": "Cartes du haut" },
      { "key": "cartesBas", "label": "Cartes du bas" },
      { "key": "cartesCote", "label": "Cartes sur le côté" },
      { "key": "grotte", "label": "Grotte" }
    ]
  }'::jsonb
);

-- Forêt Mixte timer: 45 s + 10 s / tour, capped at 150 s.
insert into public.config_templates (boardgame_id, fields)
select id, '[
    { "key": "turnBaseS", "label": "Durée de base (s)", "type": "integer", "min": 5, "max": 600, "default": 45 },
    { "key": "turnStepS", "label": "Augmentation par tour (s)", "type": "integer", "min": 0, "max": 120, "default": 10 },
    { "key": "turnMaxS", "label": "Durée max (s)", "type": "integer", "min": 5, "max": 900, "default": 150 }
  ]'::jsonb
from public.boardgames
where name = 'Forêt Mixte'
on conflict (boardgame_id) do nothing;

-- Wingspan: birds, round-goal points, nectar, eggs, bonus cards, cached food
-- tokens, and tucked cards.
insert into public.boardgames (name, kind, min_players, max_players, scoring)
values (
  'Wingspan',
  'competitive',
  1,
  5,
  '{
    "timing": "final",
    "entry": "categories",
    "winCondition": { "type": "highest" },
    "sheet": [
      { "key": "oiseaux", "label": "Oiseaux" },
      { "key": "objectifsManche", "label": "Objectifs de manche" },
      { "key": "nectar", "label": "Nectar" },
      { "key": "oeufs", "label": "Œufs" },
      { "key": "cartesObjectif", "label": "Cartes objectif" },
      { "key": "nourritureStockee", "label": "Jetons nourriture stockés" },
      { "key": "cartesRecouvertes", "label": "Cartes recouvertes" }
    ]
  }'::jsonb
);

-- Wingspan timer: 60 s + 15 s / tour, capped at 240 s (turns get heavier).
insert into public.config_templates (boardgame_id, fields)
select id, '[
    { "key": "turnBaseS", "label": "Durée de base (s)", "type": "integer", "min": 5, "max": 600, "default": 60 },
    { "key": "turnStepS", "label": "Augmentation par tour (s)", "type": "integer", "min": 0, "max": 120, "default": 15 },
    { "key": "turnMaxS", "label": "Durée max (s)", "type": "integer", "min": 5, "max": 900, "default": 240 }
  ]'::jsonb
from public.boardgames
where name = 'Wingspan'
on conflict (boardgame_id) do nothing;
