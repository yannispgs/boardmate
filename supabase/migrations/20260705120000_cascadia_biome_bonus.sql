-- Enrich Cascadia's scoresheet, in one full re-set (idempotent, readable):
--   * Biomes are *ranked*: on top of the corridor points entered per player,
--     each biome awards placement points (1st: 3, 2nd: 1; ties split the awards
--     of the places they occupy, floored) — encoded as `rankBonus` on the
--     "Biomes" subsection so every biome line is ranked independently.
--   * Each animal / biome carries identifying `colors` (hex), drawn as a dot
--     next to its label; two-tone biomes (montagne, marais) list two colours.
update public.boardgames
set scoring = '{
  "timing": "final",
  "entry": "categories",
  "winCondition": { "type": "highest" },
  "sheet": [
    { "label": "Animaux", "categories": [
      { "key": "ours", "label": "Ours", "colors": ["#5F4A4A"] },
      { "key": "buse", "label": "Buse", "colors": ["#3BD1FC"] },
      { "key": "renard", "label": "Renard", "colors": ["#CD8044"] },
      { "key": "wapiti", "label": "Wapiti", "colors": ["#C3C189"] },
      { "key": "saumon", "label": "Saumon", "colors": ["#DD4A97"] }
    ] },
    { "label": "Biomes", "rankBonus": [3, 1], "categories": [
      { "key": "foret", "label": "Forêt", "colors": ["#21632D"] },
      { "key": "montagne", "label": "Montagne", "colors": ["#5E636D", "#CCE2F3"] },
      { "key": "prairie", "label": "Prairie", "colors": ["#DDB012"] },
      { "key": "marais", "label": "Marais", "colors": ["#98A92F", "#52938B"] },
      { "key": "riviere", "label": "Rivière", "colors": ["#3F7EB1"] }
    ] },
    { "label": "Pommes de pin", "key": "pommesDePin" }
  ]
}'::jsonb
where name = 'Cascadia';
