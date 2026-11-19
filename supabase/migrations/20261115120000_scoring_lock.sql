-- Counting the points of a party is a moment the whole table shares: every
-- phone has the game open, and any of them can open the score form. Two phones
-- filling it in at once each recorded their own sheet, and the first one
-- through stood — the other found out only once it pressed « Terminer ».
--
-- The form is now held by one phone at a time. Opening it takes the hold, which
-- the other phones see as it lands; finishing the party is refused to any phone
-- that does not hold it. The hold belongs to a *device*, not to an account: two
-- phones signed in on the same account are still two people with a pen.
--
-- Nothing ever times the hold out on its own: a phone that dies mid-count keeps
-- it. Ten minutes after it was taken, any other phone may take it over, on
-- purpose — that is the one way round a holder who has gone.
alter table public.games
  add column scoring_lock      uuid,
  add column scoring_locked_at timestamptz;

comment on column public.games.scoring_lock is
  'The device counting the points of this party, while it does.';
comment on column public.games.scoring_locked_at is
  'When that device took the hold; ten minutes on, another may take it over.';

-- Takes the hold for `p_device`, or keeps it when it already has it, and says
-- who holds it afterwards — which is how a phone that lost the race learns it.
--
-- A single UPDATE settles two phones asking at once: the second one waits for
-- the first to commit, then re-reads the row and finds it taken.
--
-- `security invoker`, as every game write: the caller's RLS decides, exactly as
-- a direct UPDATE would, so a finished game cannot be locked by anybody.
create function public.claim_scoring(
  p_game      uuid,
  p_device    uuid,
  p_take_over boolean default false
)
  returns table (holder uuid, locked_at timestamptz, status text)
  language plpgsql
  security invoker
  set search_path to ''
as $$
begin
  update public.games g
     set scoring_lock      = p_device,
         -- Asking again does not restart the ten minutes the others wait.
         scoring_locked_at = case
                               when g.scoring_lock = p_device
                                 then g.scoring_locked_at
                               else now()
                             end
   where g.id = p_game
     and g.status = 'ongoing'
     and (
       g.scoring_lock is null
       or g.scoring_lock = p_device
       or (p_take_over and g.scoring_locked_at <= now() - interval '10 minutes')
     );

  return query
    select g.scoring_lock, g.scoring_locked_at, g.status
      from public.games g
     where g.id = p_game;
end;
$$;

-- Gives the hold back. Only its holder can: a phone that lost it in a take-over
-- leaving the page must not free the form under the phone that took it.
create function public.release_scoring(p_game uuid, p_device uuid)
  returns void
  language sql
  security invoker
  set search_path to ''
as $$
  update public.games
     set scoring_lock = null,
         scoring_locked_at = null
   where id = p_game
     and status = 'ongoing'
     and scoring_lock = p_device;
$$;

-- Records a finished party in one transaction: the turn it ends on, every
-- player's score, the winners, and only **then** the status.
--
-- The order is the point. A player's role may write a game while it is being
-- played and not once it is over (`games.updateLive` against
-- `games.updateDone`), so the scores written after the status, as the app used
-- to, matched no row for them — silently: the party ended with no score and no
-- winner. Written before, they land while the game is still theirs to write.
--
-- One transaction also means a party is recorded whole or not at all, where the
-- separate requests could leave a closing turn behind a refused end.
--
-- `p_scores`       : [{ player_id, score, breakdown }] — the breakdown may be null.
-- `p_coop_won`     : a cooperative game's shared outcome; null for the others,
--                    whose winners are `p_winners`.
-- `p_closing_turn` : the turn the party ends on, null when it was not in one —
--                    { duration_s, pause_count, pause_duration_s, overtime_s,
--                      simultaneous, staged, blocked_by_player_id, waited_s }.
--
-- Refusals carry their own SQLSTATE so the app can tell them apart:
--   BMEND — the party is already over (or not visible to the caller);
--   BMLCK — another phone holds the score form.
create function public.end_game(
  p_game         uuid,
  p_device       uuid,
  p_winners      uuid[],
  p_scores       jsonb,
  p_tie_break    jsonb   default null,
  p_coop_won     boolean default null,
  p_closing_turn jsonb   default null
)
  returns void
  language plpgsql
  security invoker
  set search_path to ''
as $$
declare
  game     record;
  expected int;
  written  int;
begin
  -- Locks the row: a second phone ending the same party waits here, then
  -- finds it over.
  select g.status, g.round, g.turn, g.stage, g.current_player_id, g.scoring_lock
    into game
    from public.games g
   where g.id = p_game
     for update;

  if not found or game.status <> 'ongoing' then
    raise exception 'game already ended' using errcode = 'BMEND';
  end if;

  if game.scoring_lock is not null and game.scoring_lock <> p_device then
    raise exception 'another device is counting the points'
      using errcode = 'BMLCK';
  end if;

  if p_closing_turn is not null
     and (
       (p_closing_turn ->> 'simultaneous')::boolean
       or game.current_player_id is not null
     )
  then
    insert into public.game_turns (
      game_id, player_id, blocked_by_player_id, waited_s, round, turn_no,
      stage, duration_s, pause_count, pause_duration_s, overtime_s
    )
    values (
      p_game,
      case when (p_closing_turn ->> 'simultaneous')::boolean
        then null else game.current_player_id end,
      case when (p_closing_turn ->> 'simultaneous')::boolean
        then (p_closing_turn ->> 'blocked_by_player_id')::uuid end,
      (p_closing_turn ->> 'waited_s')::int,
      game.round,
      game.turn,
      case when (p_closing_turn ->> 'staged')::boolean then game.stage end,
      (p_closing_turn ->> 'duration_s')::int,
      (p_closing_turn ->> 'pause_count')::int,
      (p_closing_turn ->> 'pause_duration_s')::int,
      (p_closing_turn ->> 'overtime_s')::int
    );
  end if;

  expected := jsonb_array_length(coalesce(p_scores, '[]'::jsonb));

  if expected > 0 then
    update public.game_players gp
       set score = round(s.score),
           score_breakdown = s.breakdown
      from jsonb_to_recordset(p_scores)
             as s(player_id uuid, score numeric, breakdown jsonb)
     where gp.game_id = p_game
       and gp.player_id = s.player_id;

    get diagnostics written = row_count;

    -- A write that lands nowhere is the silence this function exists to end.
    if written <> expected then
      raise exception 'scores reached % of % players', written, expected;
    end if;
  end if;

  if p_coop_won is not null then
    update public.game_players
       set is_winner = p_coop_won
     where game_id = p_game;
  else
    expected := (select count(distinct w) from unnest(p_winners) as w);

    update public.game_players
       set is_winner = true
     where game_id = p_game
       and player_id = any (p_winners);

    get diagnostics written = row_count;

    if written <> expected then
      raise exception 'winners reached % of % players', written, expected;
    end if;
  end if;

  update public.games
     set status = 'ended',
         ended_at = now(),
         tie_break = p_tie_break,
         scoring_lock = null,
         scoring_locked_at = null
   where id = p_game;
end;
$$;

revoke execute on function public.claim_scoring(uuid, uuid, boolean) from public, anon;
revoke execute on function public.release_scoring(uuid, uuid) from public, anon;
revoke execute on function public.end_game(uuid, uuid, uuid[], jsonb, jsonb, boolean, jsonb) from public, anon;
grant execute on function public.claim_scoring(uuid, uuid, boolean) to authenticated;
grant execute on function public.release_scoring(uuid, uuid) to authenticated;
grant execute on function public.end_game(uuid, uuid, uuid[], jsonb, jsonb, boolean, jsonb) to authenticated;
