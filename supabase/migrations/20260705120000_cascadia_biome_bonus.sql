-- Cascadia biomes are *ranked*: on top of the corridor points entered per
-- player, each biome awards placement points (1st: 3, 2nd: 1; ties split the
-- awards of the places they occupy, floored). Encoded as `rankBonus` on the
-- "Biomes" subsection so every biome line is ranked independently across
-- players. Full re-set of Cascadia's scoring for readability (idempotent).
update public.boardgames
set scoring = '{
  "timing": "final",
  "entry": "categories",
  "winCondition": { "type": "highest" },
  "sheet": [
    { "label": "Animaux", "categories": [
      { "key": "ours", "label": "Ours" },
      { "key": "buse", "label": "Buse" },
      { "key": "renard", "label": "Renard" },
      { "key": "wapiti", "label": "Wapiti" },
      { "key": "saumon", "label": "Saumon" }
    ] },
    { "label": "Biomes", "rankBonus": [3, 1], "categories": [
      { "key": "foret", "label": "Forêt" },
      { "key": "montagne", "label": "Montagne" },
      { "key": "prairie", "label": "Prairie" },
      { "key": "marais", "label": "Marais" },
      { "key": "riviere", "label": "Rivière" }
    ] },
    { "label": "Pommes de pin", "key": "pommesDePin" }
  ]
}'::jsonb
where name = 'Cascadia';
