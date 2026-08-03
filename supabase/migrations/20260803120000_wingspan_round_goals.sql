-- Wingspan's end-of-stage goals (« objectifs de fin de manche »), as authored
-- reference data. A game of Wingspan is played over 4 stages, each with one goal
-- tile drawn at setup; the table enters the POINTS each player scored on it.
--
-- The 4 goals are PICKED from this catalogue rather than typed, so per-goal
-- statistics stay possible (group by the goal key). A goal is either a one-off
-- ("Oiseaux (total)") or a family with a parameter — « Œufs dans X » where X is
-- the habitat — which is why `params` is a list of {key, label, options}.
-- Deliberately a list: no goal has two parameters today, but a later expansion
-- adding one must not force a schema change over already-recorded games.
--
-- Catalogue only: nothing reads these columns yet (the picker, the stage model
-- and the per-goal stats come next). The Oceania extension is therefore seeded
-- INACTIVE so it stays out of the new-game funnel until its scoring is wired.

alter table public.boardgames
  add column round_goals jsonb not null default '[]';

alter table public.extensions
  add column round_goals jsonb not null default '[]';

comment on column public.boardgames.round_goals is
  'RoundGoal[] — the base game''s end-of-stage goal tiles, picked at game creation.';
comment on column public.extensions.round_goals is
  'RoundGoal[] — goal tiles this extension adds to the base game''s catalogue.';

-- Base game: 16 tiles = 4 families (habitat/nest based) + 2 one-offs.
-- The third habitat is « Mer » on purpose: the official French term is
-- marais/zones humides, but the owner reads the blue habitat as the sea.
update public.boardgames
set round_goals = '[
  { "key": "birdsInHabitat", "label": "Oiseaux dans {habitat}",
    "params": [{ "key": "habitat", "label": "Écosystème", "options": [
      { "value": "forest", "label": "Forêt", "icon": "habitat-forest" },
      { "value": "grassland", "label": "Prairie", "icon": "habitat-grassland" },
      { "value": "sea", "label": "Mer", "icon": "habitat-sea" }
    ] }] },
  { "key": "eggsInHabitat", "label": "Œufs dans {habitat}",
    "params": [{ "key": "habitat", "label": "Écosystème", "options": [
      { "value": "forest", "label": "Forêt", "icon": "habitat-forest" },
      { "value": "grassland", "label": "Prairie", "icon": "habitat-grassland" },
      { "value": "sea", "label": "Mer", "icon": "habitat-sea" }
    ] }] },
  { "key": "nestsWithEggs", "label": "Nids {nest} avec des œufs",
    "params": [{ "key": "nest", "label": "Type de nid", "options": [
      { "value": "platform", "label": "Plateforme", "icon": "nest-platform" },
      { "value": "bowl", "label": "Coupe", "icon": "nest-bowl" },
      { "value": "cavity", "label": "Cavité", "icon": "nest-cavity" },
      { "value": "ground", "label": "Sol", "icon": "nest-ground" }
    ] }] },
  { "key": "eggsInNests", "label": "Œufs dans les nids {nest}",
    "params": [{ "key": "nest", "label": "Type de nid", "options": [
      { "value": "platform", "label": "Plateforme", "icon": "nest-platform" },
      { "value": "bowl", "label": "Coupe", "icon": "nest-bowl" },
      { "value": "cavity", "label": "Cavité", "icon": "nest-cavity" },
      { "value": "ground", "label": "Sol", "icon": "nest-ground" }
    ] }] },
  { "key": "eggSets", "label": "Séries de 3 œufs", "params": [] },
  { "key": "totalBirds", "label": "Oiseaux (total)", "params": [] }
]'::jsonb
where name = 'Wingspan';

-- Oceania: 8 more tiles, including the « Pas d''objectif » one. That tile scores
-- nothing, and its action cube is never spent on the goal board — it returns to
-- stock, granting one extra turn in EVERY following stage. Modelled as two
-- properties of the goal (`scores` / `extraTurn`) so the stage calendar is a
-- rule over the catalogue, never a special case on the extension's name.
insert into public.extensions (base_game_id, name, is_active, sort_order, round_goals)
select
  id,
  'Wingspan - Océanie',
  false,
  0,
  '[
    { "key": "beakLeft", "label": "Bec tourné vers la gauche", "params": [] },
    { "key": "beakRight", "label": "Bec tourné vers la droite", "params": [] },
    { "key": "foodCost", "label": "{food} dans le coût en nourriture de vos oiseaux",
      "params": [{ "key": "food", "label": "Nourriture", "options": [
        { "value": "invertebrate", "label": "Invertébrés", "icon": "food-invertebrate" },
        { "value": "fruitSeed", "label": "Fruits + graines", "icon": "food-fruit-seed" },
        { "value": "rodentFish", "label": "Rongeurs + poissons", "icon": "food-rodent-fish" }
      ] }] },
    { "key": "cubesOnPlayBird", "label": "Cubes sur « Jouer un oiseau »", "params": [] },
    { "key": "cheapBirds", "label": "Oiseaux valant 3 points ou moins", "params": [] },
    { "key": "noGoal", "label": "Pas d''objectif", "params": [],
      "scores": false, "extraTurn": 1 }
  ]'::jsonb
from public.boardgames
where name = 'Wingspan';
