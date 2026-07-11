-- Simultaneous-play games: everyone plays at once each round (e.g. Splito),
-- instead of taking individual turns in seat order.

-- Play mode on the boardgame. Existing games default to the current behaviour.
alter table public.boardgames
  add column if not exists turn_mode text not null default 'sequential'
    check (turn_mode in ('sequential', 'simultaneous'));

-- A simultaneous round is a single shared turn with no owner, so a turn can now
-- have no player. It may instead record which player the table waited on.
alter table public.game_turns alter column player_id drop not null;
alter table public.game_turns
  add column if not exists blocked_by_player_id uuid references public.players(id);

-- Splito: 3-8 players, 13 fixed rounds, simultaneous, highest total wins.
insert into public.boardgames
  (name, kind, min_players, max_players, round_limit, turn_mode, scoring)
values (
  'Splito',
  'competitive',
  3,
  8,
  13,
  'simultaneous',
  '{
    "timing": "final",
    "entry": "total",
    "winCondition": { "type": "highest" }
  }'::jsonb
);

-- Splito timer: 20 s + 4 s / round, capped at 60 s (quick card picks).
insert into public.config_templates (boardgame_id, fields)
select id, '[
    { "key": "turnBaseS", "label": "Durée de base (s)", "type": "integer", "min": 5, "max": 600, "default": 20 },
    { "key": "turnStepS", "label": "Augmentation par tour (s)", "type": "integer", "min": 0, "max": 120, "default": 4 },
    { "key": "turnMaxS", "label": "Durée max (s)", "type": "integer", "min": 5, "max": 900, "default": 60 }
  ]'::jsonb
from public.boardgames
where name = 'Splito'
on conflict (boardgame_id) do nothing;
