-- Generations: rounds a player can drop out of before the others (Terraforming
-- Mars).
--
-- Every game so far turns in plain laps of the table — everyone plays exactly
-- one turn per lap, so the active seat is arithmetic (`(turn - 1) % seats`) and
-- nothing about "who is still in" has to be stored. Terraforming Mars breaks
-- that and only that: a player *passes*, ending his own turns for the current
-- generation while the others carry on taking as many as they like. Turn counts
-- inside one generation are therefore unequal and unpredictable.
--
-- So the active seat stops being derivable from the turn counter alone. It is
-- still derived, not stored — from the last turn actually taken plus the set of
-- players already out — which keeps the property the turn engine was built for:
-- there is no "current player" column that can drift out of sync.

-- Which games are played this way, and what a generation is called there. Null
-- for every game played in plain laps.
alter table public.boardgames
  add column if not exists stages jsonb;

comment on column public.boardgames.stages is
  'Generation play, as { "label": "Génération" }. Null for lap-based games.';

-- The generation a game is currently in, 1-based. Meaningless (and left at 1)
-- for lap-based games.
alter table public.games
  add column if not exists stage integer not null default 1
    check (stage >= 1);

-- The generation a turn was taken in, so the stats can read turns per player
-- per generation by grouping. Null on turns played before this existed, and on
-- every lap-based game.
alter table public.game_turns
  add column if not exists stage integer;

create index if not exists game_turns_stage_idx
  on public.game_turns (game_id, stage);

-- One row per player who has passed, per generation. It is both the set of
-- players currently out — the rows whose `stage` is the game's — and the record
-- of which generation each player dropped out of, kept for the stats.
--
-- Cascades on the game: passes are part of a played game, not history of their
-- own. The unique key makes passing twice a no-op rather than a double row.
create table if not exists public.game_stage_passes (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games (id) on delete cascade,
  player_id  uuid not null references public.players (id),
  stage      integer not null check (stage >= 1),
  created_at timestamptz not null default now(),
  unique (game_id, player_id, stage)
);

create index if not exists game_stage_passes_game_idx
  on public.game_stage_passes (game_id, stage);

-- Same access model as the rest: authenticated read/write, anon denied by RLS
-- (no anon policy) even though the grant is permissive. Deletable, because a
-- mistapped "Passe" has to be undoable at the table.
--
-- The policies are dropped first so the whole file can be replayed: it is
-- applied to production by hand, and a re-run has to be a no-op.
alter table public.game_stage_passes enable row level security;

drop policy if exists game_stage_passes_read on public.game_stage_passes;
drop policy if exists game_stage_passes_insert on public.game_stage_passes;
drop policy if exists game_stage_passes_update on public.game_stage_passes;
drop policy if exists game_stage_passes_delete on public.game_stage_passes;

create policy game_stage_passes_read on public.game_stage_passes
  for select to authenticated using (true);
create policy game_stage_passes_insert on public.game_stage_passes
  for insert to authenticated with check (true);
create policy game_stage_passes_update on public.game_stage_passes
  for update to authenticated using (true) with check (true);
create policy game_stage_passes_delete on public.game_stage_passes
  for delete to authenticated using (true);

grant select, insert, update, delete on public.game_stage_passes
  to anon, authenticated;

-- Terraforming Mars is the one game that plays this way today.
update public.boardgames
set stages = '{"label": "Génération"}'::jsonb
where name = 'Terraforming Mars';
