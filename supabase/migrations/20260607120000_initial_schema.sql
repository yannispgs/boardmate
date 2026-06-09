-- Boardmate — initial schema
-- Entities: players, boardgames, config templates & instances, games,
-- game participations (game_players) and the per-turn log (game_turns).
--
-- Security model: the browser uses the public anon key, so RLS is the real
-- lock. Every table denies anon and grants full CRUD to authenticated users
-- (a small trusted friend group; per-user separation is not needed in v1).

-- =========================================================================
-- Tables
-- =========================================================================

create table public.players (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  -- Players are deactivated (hidden from selection), never deleted.
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.boardgames (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique check (length(btrim(name)) > 0),
  logo_url         text,
  -- Hard limits allowed by the box.
  min_players      int check (min_players >= 1),
  max_players      int check (max_players >= 1),
  -- Recommended ("sweet spot") range, e.g. 2-8 allowed but best at 3-4.
  rec_min_players  int check (rec_min_players >= 1),
  rec_max_players  int check (rec_max_players >= 1),
  kind             text not null default 'competitive'
                     check (kind in ('competitive', 'cooperative', 'hybrid')),
  avg_duration_min int check (avg_duration_min >= 0),
  tags             text[] not null default '{}',
  created_at       timestamptz not null default now(),
  constraint boardgames_player_bounds check (
    min_players is null or max_players is null or min_players <= max_players
  ),
  constraint boardgames_rec_bounds check (
    rec_min_players is null or rec_max_players is null
      or rec_min_players <= rec_max_players
  )
);

-- One fixed configuration template per boardgame: an ordered list of FieldSpec
-- (jsonb). Authored as data (no source code needed). 1:1 with boardgame.
create table public.config_templates (
  boardgame_id uuid primary key
                 references public.boardgames (id) on delete cascade,
  fields       jsonb not null default '[]'::jsonb
);

-- Named configuration instances; `values` is validated against the template
-- in the application before insert/update.
create table public.configs (
  id           uuid primary key default gen_random_uuid(),
  boardgame_id uuid not null references public.boardgames (id) on delete cascade,
  name         text not null check (length(btrim(name)) > 0),
  values       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (boardgame_id, name)
);

create table public.games (
  id                uuid primary key default gen_random_uuid(),
  -- restrict: keep history; a boardgame with games cannot be deleted.
  boardgame_id      uuid not null references public.boardgames (id) on delete restrict,
  config_id         uuid references public.configs (id) on delete set null,
  status            text not null default 'ongoing'
                      check (status in ('ongoing', 'ended')),
  round             int not null default 1 check (round >= 1),
  turn              int not null default 1 check (turn >= 1),
  current_player_id uuid references public.players (id) on delete set null,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz
);

-- Participation: one row per (game, player). The grain that makes stats
-- natural. v1 records is_winner only; score/placement/faction come later.
create table public.game_players (
  game_id    uuid not null references public.games (id) on delete cascade,
  -- restrict: keep history; a player who has played cannot be hard-deleted.
  player_id  uuid not null references public.players (id) on delete restrict,
  seat_order int not null check (seat_order >= 0),
  is_winner  boolean not null default false,
  primary key (game_id, player_id),
  unique (game_id, seat_order)
);

-- Turn log: one row per completed turn. Total game time and per-player time
-- are derived by summing duration_s (active time, pauses excluded).
create table public.game_turns (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games (id) on delete cascade,
  player_id  uuid not null references public.players (id) on delete restrict,
  round      int not null check (round >= 1),
  turn_no    int not null check (turn_no >= 1),
  duration_s int not null check (duration_s >= 0),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Indexes (foreign keys / common filters)
-- =========================================================================

create index configs_boardgame_id_idx     on public.configs (boardgame_id);
create index games_status_idx             on public.games (status);
create index games_boardgame_id_idx       on public.games (boardgame_id);
create index game_players_player_id_idx   on public.game_players (player_id);
create index game_turns_game_id_idx       on public.game_turns (game_id);
create index game_turns_player_id_idx     on public.game_turns (player_id);

-- =========================================================================
-- Row Level Security: deny anon, full CRUD for authenticated users
-- =========================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'boardgames', 'config_templates',
    'configs', 'games', 'game_players', 'game_turns'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true);',
      t || '_authenticated_all', t
    );
  end loop;
end $$;

-- players: read / create / update for authenticated, but NEVER delete.
-- Players are deactivated (is_active = false), never removed (preserve stats).
alter table public.players enable row level security;
create policy players_authenticated_select on public.players
  for select to authenticated using (true);
create policy players_authenticated_insert on public.players
  for insert to authenticated with check (true);
create policy players_authenticated_update on public.players
  for update to authenticated using (true) with check (true);

-- =========================================================================
-- Storage: public "logos" bucket (public read, authenticated write)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos_public_read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos_authenticated_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos');

create policy "logos_authenticated_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos') with check (bucket_id = 'logos');

create policy "logos_authenticated_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos');
