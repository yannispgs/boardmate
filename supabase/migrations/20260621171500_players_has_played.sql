-- Denormalize "has this player ever taken part in a game" onto `players` as a
-- boolean column, so the Players screen reads a plain column instead of
-- aggregating `game_players` on every load.
--
-- A trigger flips it to true on the first participation. It is one-way: history
-- is permanent — a player who has played can only be deactivated, never reset —
-- so we never set it back to false.

alter table public.players
  add column has_played boolean not null default false;

-- Backfill from existing participations (idempotent on re-run).
update public.players p
  set has_played = true
  where exists (
    select 1 from public.game_players gp where gp.player_id = p.id
  );

-- Set the flag whenever a player joins a game. SECURITY DEFINER so the
-- invariant holds regardless of the caller's table privileges; empty
-- search_path means every reference must be schema-qualified (hardening).
create or replace function public.mark_player_has_played()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.players
    set has_played = true
    where id = new.player_id and has_played = false;
  return new;
end;
$$;

create trigger game_players_mark_has_played
  after insert on public.game_players
  for each row
  execute function public.mark_player_has_played();
