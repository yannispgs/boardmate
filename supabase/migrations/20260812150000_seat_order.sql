-- Correcting the seating of a game already in progress, when the table was
-- entered in the wrong order at launch.
--
-- It cannot be a plain series of UPDATEs from the client: `game_players` carries
-- `unique (game_id, seat_order)`, which PostgreSQL checks row by row, so simply
-- swapping two neighbours collides on the seat one of them is moving into. The
-- reorder therefore has to happen inside one transaction, which the REST API
-- cannot express — hence this function, whose body is its own transaction: it
-- first parks every seat of the game out of the numbering in use, then lays the
-- new order down.
--
-- `security invoker` on purpose: the function must be subject to the caller's
-- RLS exactly as a direct UPDATE would be, so it can never become a way round
-- the policies on `game_players`.
create or replace function public.set_game_seat_order(
  p_game    uuid,
  p_players uuid[]
)
  returns void
  language plpgsql
  security invoker
  set search_path to ''
as $$
declare
  seated   int;
  moved    int;
  playing  int;
begin
  select count(*) into seated
    from public.game_players
   where game_id = p_game;

  -- Which *place* round the table is up, rather than who: the turn belongs to
  -- the seat, so after the reorder it is whoever now sits there.
  select gp.seat_order into playing
    from public.game_players gp
    join public.games g
      on g.id = gp.game_id
     and g.current_player_id = gp.player_id
   where gp.game_id = p_game;

  -- A partial list would leave the players it omits parked on the offset seats,
  -- so the whole table has to be named — and named once each.
  if seated <> coalesce(array_length(p_players, 1), 0)
     or seated <> (select count(distinct id) from unnest(p_players) as id)
  then
    raise exception 'seat order must list each player of the game exactly once';
  end if;

  -- Out of the way of the unique index, above any seat number in use.
  update public.game_players
     set seat_order = seat_order + 1000
   where game_id = p_game;

  update public.game_players gp
     set seat_order = seat.ord - 1
    from unnest(p_players) with ordinality as seat(player_id, ord)
   where gp.game_id = p_game
     and gp.player_id = seat.player_id;

  get diagnostics moved = row_count;

  -- Names a player who isn't at this table: the seats it did move are still
  -- parked at +1000, so the whole thing has to go back.
  if moved <> seated then
    raise exception 'seat order names a player who is not in this game';
  end if;

  if playing is not null then
    update public.games
       set current_player_id = (
             select player_id
               from public.game_players
              where game_id = p_game
                and seat_order = playing
           )
     where id = p_game;
  end if;
end;
$$;

-- Only a signed-in user reorders a table. Anonymous callers are already stopped
-- by RLS (the function runs as its caller), but the grant says so explicitly.
revoke execute on function public.set_game_seat_order(uuid, uuid[]) from public;
grant execute on function public.set_game_seat_order(uuid, uuid[]) to authenticated;
