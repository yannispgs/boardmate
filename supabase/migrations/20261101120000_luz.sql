-- Luz (Iello): a trick-taking card game played in four donnes, scored on bets.
--
-- Each donne, every player bets on the tricks he will take, and may add the
-- safety token — « that many, or one more ». A won bet pays 10, 20, 30 then 40
-- points as the donnes go (half that with the token); a lost one costs 5 per
-- trick off. The highest total after the fourth donne wins.
--
-- The table writes down only each donne's points, never the bets nor the
-- tricks (owner's call, 2026-10-31): the points alone already say whether the
-- bet came off and by how much it was missed. The one more fact the stats need
-- is whether the player hedged — the `hedged` column below.

alter table public.game_stage_scores
  add column if not exists hedged boolean not null default false;

comment on column public.game_stage_scores.hedged is
  'Whether the player hedged his bet of that manche — the safety token, in '
  'Luz. Always false for a game not played on bets.';

comment on column public.boardgames.stages is
  'StageSpec — { "label", "advance": "pass" | "schedule" | "manual", '
  '"schedule": int[], "maxPoints": int, "pointsStep": int, '
  '"ladder": { "label", "steps": text[], "fixedKey", "unclearedMin" }, '
  '"count": int, "bet": { "win", "hedgedWin", "missPerTrick", "tricks", '
  '"hedgeLabel" } }. "count" is the number of manches a game lasts; "bet" '
  'the scale of a game scored on bets. Null for a game turning in plain laps.';

-- Ten tricks a donne, so a bet is missed by ten at the most: −50.
--
-- Timed like Phase 10, never per turn: one table stopwatch per donne, banked
-- when the donne closes. Its own records, besides the best total: the worst
-- donne ever taken, the most bets won in a party (all four is the perfect
-- one), and the longest run of won bets.
--
-- Level at the top: the most points on the last donne, which the app knows,
-- then the player closest to the first one in the turn order, which it asks.
insert into public.boardgames (
  name,
  kind,
  min_players,
  max_players,
  avg_duration_min,
  tags,
  turn_mode,
  is_timed,
  scoring,
  stages,
  phases
)
values (
  'Luz',
  'competitive',
  3,
  5,
  45,
  array['cartes', 'plis'],
  'sequential',
  true,
  '{
    "timing": "final",
    "entry": "total",
    "winCondition": { "type": "highest" },
    "allowNegative": true,
    "extraRecords": ["worstStage", "betsWon", "betStreak"],
    "tieBreak": [
      {
        "key": "lastStage",
        "label": "Le plus de points à la dernière donne",
        "source": "lastStage"
      },
      {
        "key": "turnOrder",
        "label": "Le plus proche du premier joueur dans l''ordre du tour",
        "direction": "lowest",
        "source": "ask",
        "help": "1 pour le premier joueur, 2 pour son voisin de gauche…"
      }
    ]
  }'::jsonb,
  '{
    "label": "Donne",
    "advance": "manual",
    "count": 4,
    "bet": {
      "win": 10,
      "hedgedWin": 5,
      "missPerTrick": 5,
      "tricks": 10,
      "hedgeLabel": "Jeton Sécurité"
    }
  }'::jsonb,
  '[
    {
      "key": "donne",
      "label": "Donne",
      "mode": "simultaneous",
      "clock": "stopwatch"
    }
  ]'::jsonb
);

-- The rulebook's answers to what the table asks every game, read from the
-- official French rules (Iello).
insert into public.faq_entries (boardgame_id, question, answer, sort_order)
select b.id, q.question, q.answer, q.sort_order
from public.boardgames b
cross join (values
  (
    'Combien rapporte un pari ?',
    E'Pari réussi sans bille Sécurité : 10, 20, 30 puis 40 points de la 1re à la 4e donne.\nPari réussi avec bille Sécurité : 5, 10, 15 puis 20 points.\nPari raté : −5 points par pli d''écart avec le nombre de billes Pari, avec ou sans bille Sécurité. Le score peut devenir négatif.',
    1
  ),
  (
    'À quoi sert la bille Sécurité ?',
    'On peut en prendre une en plus de ses billes Pari : le pari est alors réussi avec autant de plis que de billes Pari, ou un de plus. Il rapporte moitié moins. On peut parier 0 pli, ou ne prendre qu''une bille Sécurité.',
    2
  ),
  (
    'Quelle carte remporte le pli ?',
    'Le jaune est l''atout : la plus forte carte jaune remporte le pli. Si aucun jaune n''a été joué, c''est la plus forte carte de la couleur demandée. On doit fournir la couleur demandée si on en a.',
    3
  ),
  (
    'Quelles cartes garder selon le nombre de joueurs ?',
    E'3 joueurs : valeurs 1 à 8.\n4 joueurs : valeurs 1 à 10.\n5 joueurs : valeurs 1 à 12.\nChaque donne se joue en 10 plis : 10 cartes par joueur, les 10 restantes sont mises de côté.',
    4
  ),
  (
    'Qui commence la 4e donne à 3 joueurs ?',
    'À 3 joueurs, lors de la 4e donne uniquement, le joueur qui a le plus de points parie et entame en premier. En cas d''égalité, c''est le plus proche du premier joueur dans l''ordre du tour (ou le premier joueur lui-même).',
    5
  ),
  (
    'Qui gagne en cas d''égalité ?',
    'Après la 4e donne, le plus haut total gagne. À égalité, celui qui a marqué le plus de points à la dernière donne ; puis le plus proche du premier joueur dans l''ordre du tour.',
    6
  )
) as q (question, answer, sort_order)
where b.name = 'Luz';
