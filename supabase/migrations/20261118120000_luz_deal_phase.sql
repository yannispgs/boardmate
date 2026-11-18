-- Luz: the donne opens on the deal, timed like the bets and the tricks that
-- follow it; the trick phase reads « Plis », every trick of the donne being
-- played in it. The keys stay, so the times already banked keep their phase.
update public.boardgames
set phases = '[
  {
    "key": "deal",
    "label": "Distribution",
    "mode": "sequential",
    "clock": "stopwatch"
  },
  {
    "key": "bet",
    "label": "Pari",
    "mode": "sequential",
    "clock": "stopwatch"
  },
  {
    "key": "tricks",
    "label": "Plis",
    "mode": "sequential",
    "clock": "stopwatch"
  }
]'::jsonb
where name = 'Luz';

-- A donne under way keeps the phase it was in: one more ahead of it now.
update public.games g
set phase = g.phase + 1
from public.boardgames b
where b.id = g.boardgame_id
  and b.name = 'Luz'
  and g.status = 'ongoing';
