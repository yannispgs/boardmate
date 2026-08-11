-- Terraforming Mars: scored once at the end, on the six lines its own score pad
-- prints, and won by the highest total.
--
-- Only the *scoring* is described here. The game's three global parameters
-- (température, oxygène, océans) and its generations are shared table state the
-- app has no notion of yet; a game is played with them tracked on the board, as
-- it always was, and only the final sheet is entered. Nothing below has to
-- change when they arrive.
--
-- The box plays 1-5 (there is a solo mode), and reads best at 3-4.
insert into public.boardgames
  (name, kind, min_players, max_players, rec_min_players, rec_max_players,
   turn_mode, round_limit, avg_duration_min, tags, scoring)
select
  'Terraforming Mars',
  'competitive',
  1,
  5,
  3,
  4,
  'sequential',
  -- No fixed length: the game ends at the end of the generation in which the
  -- three global parameters are all maxed out, which nobody can predict.
  null,
  120,
  array['plateau', 'cartes', 'moteur', 'gestion', 'science-fiction', 'compétition'],
  '{
    "timing": "final",
    "entry": "categories",
    "winCondition": { "type": "highest" },
    "allowNegative": false,
    "sheet": [
      { "key": "tr", "label": "Niveau de terraformation (TR)" },
      { "key": "recompenses", "label": "Récompenses" },
      { "key": "jalons", "label": "Jalons" },
      { "key": "espacesVerts", "label": "Espaces verts" },
      { "key": "cites", "label": "Cités" },
      { "key": "cartes", "label": "Cartes" }
    ],
    "tieBreak": [
      {
        "key": "megacredits",
        "label": "Le plus de M€",
        "direction": "highest",
        "source": "ask",
        "help": "Les M€ restants sur le compteur de chaque joueur à égalité."
      }
    ]
  }'::jsonb
where not exists (
  select 1 from public.boardgames where name = 'Terraforming Mars'
);

-- Turn timer: a turn is only one or two actions, but they are thought about for
-- a long time, so it is set like the other two-hour game in the app (Wingspan)
-- and tuned from the editor if the table wants it tighter.
insert into public.config_templates (boardgame_id, fields)
select b.id, '[
    { "key": "turnBaseS", "label": "Durée de base (s)", "type": "integer", "min": 5, "max": 600, "default": 60 },
    { "key": "turnStepS", "label": "Augmentation par tour (s)", "type": "integer", "min": 0, "max": 120, "default": 15 },
    { "key": "turnMaxS", "label": "Durée max (s)", "type": "integer", "min": 5, "max": 900, "default": 240 }
  ]'::jsonb
from public.boardgames b
where b.name = 'Terraforming Mars'
  and not exists (
    select 1 from public.config_templates c where c.boardgame_id = b.id
  );
