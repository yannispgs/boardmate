-- Optional per-boardgame dice, so roll tracking can be turned on per game.
-- `{count, sides}` → the rolled value ranges count..count*sides. Null = no dice.
alter table public.boardgames
  add column dice jsonb;

-- Catan: two six-sided dice, summed (2–12).
update public.boardgames
set dice = '{"count": 2, "sides": 6}'::jsonb
where name = 'Catan';

-- One row per recorded roll (the summed value). Ordered by created_at, the
-- sequence drives the stats: distribution, plus how long each number has gone
-- without coming up (droughts) and streaks.
create table public.dice_rolls (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games (id) on delete cascade,
  value      int not null,
  created_at timestamptz not null default now()
);
create index dice_rolls_game_id_idx on public.dice_rolls (game_id, created_at);

-- Same access model as the rest: authenticated full CRUD, anon denied by RLS.
alter table public.dice_rolls enable row level security;
create policy dice_rolls_authenticated_all on public.dice_rolls
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.dice_rolls
  to anon, authenticated;
