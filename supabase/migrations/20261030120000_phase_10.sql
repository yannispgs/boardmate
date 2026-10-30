-- Phase 10: a card game counted in manches, like Odin, where what wins is not
-- the score but how far each player has climbed.
--
-- Each player works through ten phases in order, one per manche at most; the
-- manche ends when somebody empties his hand, and everyone left holding cards
-- takes their value in points. The first player to complete the tenth phase
-- wins — the points only separate players who complete it in the same manche.
--
-- So a manche needs one more fact per player than Odin's: whether he laid his
-- phase down. That is the `cleared` column below; the ladder itself (the ten
-- phases, and the variant that moves everybody up every manche) is reference
-- data on the boardgame, in `stages.ladder`.

alter table public.game_stage_scores
  add column if not exists cleared boolean not null default false;

comment on column public.game_stage_scores.cleared is
  'Whether the player completed his objective of that manche — the phase he was '
  'working on, in Phase 10. Always false for a game with no ladder.';

-- How many laps of the table a phase took, when the table counts them (Phase
-- 10: each manche, tapped lap by lap from the board). It is what tells a phase
-- cleared in three laps from one that drags on for nine. Null wherever nobody
-- counted.
alter table public.game_phases
  add column if not exists laps integer check (laps is null or laps >= 0);

comment on column public.game_phases.laps is
  'Laps of the table this phase of this stage took, counted by the table — '
  'Phase 10''s manches. Null when nobody counted them.';

comment on column public.boardgames.stages is
  'StageSpec — { "label", "advance": "pass" | "schedule" | "manual", '
  '"schedule": int[], "maxPoints": int, "pointsStep": int, '
  '"ladder": { "label", "steps": text[], '
  '"fixedKey" } }. Null for a game turning in plain laps.';

-- Timed, but never per turn: the one phase of a manche runs a table stopwatch,
-- banked when the manche closes, so the stats know how long each manche took.
-- No plain score record: the score does not decide who wins, so « the best
-- score » would crown nobody in particular. Its records are the race to the
-- tenth phase (fewest manches, implied by the ladder), the heaviest manche ever
-- taken, and the smallest total ever won with.
insert into public.boardgames (
  name,
  kind,
  min_players,
  max_players,
  turn_mode,
  is_timed,
  avg_duration_min,
  scoring,
  stages,
  phases
)
values (
  'Phase 10',
  'competitive',
  2,
  6,
  'sequential',
  true,
  30,
  '{
    "timing": "final",
    "entry": "total",
    "winCondition": { "type": "lowest" },
    "trackRecords": false,
    "extraRecords": ["heaviestStage", "lowestWin"],
    "tieBreak": [
      {
        "key": "replayLastPhase",
        "label": "Le premier sorti en rejouant la dernière phase",
        "direction": "lowest",
        "source": "ask",
        "help": "Les ex æquo rejouent la dernière phase : 1 pour le premier à sortir, 2 pour le suivant…"
      }
    ]
  }'::jsonb,
  '{
    "label": "Manche",
    "advance": "manual",
    "pointsStep": 5,
    "ladder": {
      "label": "Phase",
      "fixedKey": "fixedStages",
      "steps": [
        "2 triplés",
        "1 triplé + 1 suite de 4",
        "1 quadruplé + 1 suite de 4",
        "1 suite de 7",
        "1 suite de 8",
        "1 suite de 9",
        "2 quadruplés",
        "7 cartes d''une même couleur",
        "1 quintuplé + 1 paire",
        "1 quintuplé + 1 triplé"
      ]
    }
  }'::jsonb,
  '[
    {
      "key": "manche",
      "label": "Manche",
      "mode": "simultaneous",
      "clock": "stopwatch"
    }
  ]'::jsonb
);

-- The one setting: the variant where everybody moves up every manche, whether
-- he laid his phase or not, and the game stops after the tenth. Off by default
-- — the manches then run until somebody clears the last phase.
insert into public.config_templates (boardgame_id, fields)
select id, '[
    {
      "key": "fixedStages",
      "label": "Variante : 10 manches, tout le monde avance",
      "type": "boolean",
      "default": false
    }
  ]'::jsonb
from public.boardgames
where name = 'Phase 10'
on conflict (boardgame_id) do nothing;

-- The rulebook's answers to what the table asks every game, read from the
-- official Mattel rules (FFY05). The Wild card is counted 20, the table's own
-- rule.
insert into public.faq_entries (boardgame_id, question, answer, sort_order)
select b.id, q.question, q.answer, q.sort_order
from public.boardgames b
cross join (values
  (
    'Quelles sont les 10 phases ?',
    E'1. 2 triplés\n2. 1 triplé + 1 suite de 4\n3. 1 quadruplé + 1 suite de 4\n4. 1 suite de 7\n5. 1 suite de 8\n6. 1 suite de 9\n7. 2 quadruplés\n8. 7 cartes d''une même couleur\n9. 1 quintuplé + 1 paire\n10. 1 quintuplé + 1 triplé\n\nUne paire, un triplé, un quadruplé… sont des cartes de même valeur, de couleurs quelconques ; une suite, des valeurs qui se suivent. Les phases se font dans l''ordre, une seule par manche.',
    1
  ),
  (
    'Combien valent les cartes qui restent en main ?',
    E'Celui qui finit la manche marque 0. Les autres comptent :\n• 1 à 9 : 5 points\n• 10 à 12 : 10 points\n• Passe : 15 points\n• Joker : 20 points\n\nLe moins de points est le mieux.',
    2
  ),
  (
    'Qui passe à la phase suivante ?',
    'Celui qui finit la manche, et tous ceux qui ont posé leur phase pendant la manche. Les autres retentent la même phase à la manche suivante.',
    3
  ),
  (
    'Qui gagne la partie ?',
    'Le premier à réaliser la phase 10 gagne, à la fin de la manche. Si plusieurs la réalisent dans la même manche, celui qui a le moins de points gagne ; s''ils sont encore à égalité, ils rejouent la phase 10 et le premier à sortir gagne.',
    4
  )
) as q (question, answer, sort_order)
where b.name = 'Phase 10';
