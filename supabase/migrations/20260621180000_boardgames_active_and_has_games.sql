-- Boardgames mirror players: deletable only while they have no games, else
-- deactivatable. Two columns drive the UI:
--   - is_active: a deactivated boardgame drops out of selection lists but keeps
--     its history (never hard-deleted once it has games).
--   - has_games: denormalized "has this boardgame ever been played", so the
--     list reads a plain column instead of aggregating games on every load.
--
-- Deletion itself is already enforced by the DB: games.boardgame_id is
-- `on delete restrict`, so deleting a boardgame with games fails (23503), which
-- the adapter surfaces as a typed BoardgameInUseError.

alter table public.boardgames
  add column is_active boolean not null default true;

alter table public.boardgames
  add column has_games boolean not null default false;

-- Backfill has_games from existing games (idempotent on re-run).
update public.boardgames b
  set has_games = true
  where exists (
    select 1 from public.games g where g.boardgame_id = b.id
  );

-- Set the flag whenever a game is created for a boardgame. SECURITY DEFINER so
-- the invariant holds regardless of the caller's table privileges; empty
-- search_path means every reference must be schema-qualified (hardening).
create or replace function public.mark_boardgame_has_games()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.boardgames
    set has_games = true
    where id = new.boardgame_id and has_games = false;
  return new;
end;
$$;

create trigger games_mark_boardgame_has_games
  after insert on public.games
  for each row
  execute function public.mark_boardgame_has_games();
