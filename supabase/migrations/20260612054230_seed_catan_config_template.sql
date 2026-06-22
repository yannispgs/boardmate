-- Seed a starter boardgame (Catan) and its config template so the
-- schema-driven config form has real data to work with in v1. Templates are
-- authored as data (no in-app template editor yet). Idempotent: re-running is
-- a no-op. Fixed UUID so the template FK is stable across environments.

insert into public.boardgames
  (id, name, min_players, max_players, rec_min_players, rec_max_players,
   avg_duration_min, tags)
values
  ('78047bc0-5293-4787-be48-ba7339d48c2d', 'Catan', 3, 4, 3, 4, 75,
   array['gestion', 'commerce'])
on conflict (id) do nothing;

-- v1 config = victory points + which bonus-point cards are in play.
-- Descriptive only (recorded with the game); no score computation in v1.
insert into public.config_templates (boardgame_id, fields)
values (
  '78047bc0-5293-4787-be48-ba7339d48c2d',
  '[
    {
      "key": "pointsToWin",
      "label": "Points pour gagner",
      "type": "integer",
      "min": 3,
      "max": 20,
      "default": 10
    },
    {
      "key": "longestRoad",
      "label": "Carte « Route la plus longue »",
      "type": "boolean",
      "default": true
    },
    {
      "key": "largestArmy",
      "label": "Carte « Armée la plus puissante »",
      "type": "boolean",
      "default": true
    },
    {
      "key": "harborMaster",
      "label": "Bonus « Maître du port »",
      "type": "boolean",
      "default": false
    }
  ]'::jsonb
)
on conflict (boardgame_id) do nothing;
