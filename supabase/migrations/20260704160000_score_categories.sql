-- Category-based final scoring.
--
-- Per player, keep the per-category point breakdown entered at the end (jsonb:
-- category key -> points), on top of the summed total in game_players.score.
-- Lets us re-display the filled scoresheet and, later, category stats.
alter table public.game_players
  add column score_breakdown jsonb;

-- A boardgame that uses category scoring, to exercise it end to end: Cascadia,
-- whose end-of-game sheet groups points by animal and by biome, plus pine cones.
--
-- `scoring.sheet` items are self-describing: `{ label, categories }` is a titled
-- subsection, `{ label, key }` is a standalone scored line.
insert into public.boardgames (name, kind, min_players, max_players, scoring)
values (
  'Cascadia',
  'competitive',
  1,
  4,
  '{
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
      { "label": "Biomes", "categories": [
        { "key": "foret", "label": "Forêt" },
        { "key": "montagne", "label": "Montagne" },
        { "key": "prairie", "label": "Prairie" },
        { "key": "marais", "label": "Marais" },
        { "key": "riviere", "label": "Rivière" }
      ] },
      { "label": "Pommes de pin", "key": "pommesDePin" }
    ]
  }'::jsonb
);
