-- Score history: one row per score change during a live-scored game, so the
-- end-of-game (and later in-game) stats can chart how each player's score
-- evolved — who led early then got caught. `setScore` writes one here.
create table public.score_events (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games (id) on delete cascade,
  player_id  uuid not null references public.players (id) on delete restrict,
  score      int not null,
  created_at timestamptz not null default now()
);
create index score_events_game_id_idx on public.score_events (game_id);

-- Same access model as the rest: authenticated full CRUD, anon denied by RLS.
alter table public.score_events enable row level security;
create policy score_events_authenticated_all on public.score_events
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.score_events
  to anon, authenticated;
