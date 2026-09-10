-- `game_phases` was the one table the RBAC never reached.
--
-- It was created on 2026-08-18, five days *after* the permission model landed
-- (20260813120000_rbac_foundation + 20260813130000_rbac_policies), and copied
-- the pre-RBAC template — four policies granting read and write to any
-- authenticated account, under a comment claiming « same access model as the
-- rest » that was already false when it was written. Every sibling table keyed
-- by `game_id` (game_turns, game_stage_passes, game_milestones, score_events,
-- dice_rolls) reads with `games.read` and writes on the parent's status; this
-- one let an account with no role at all rewrite the phase times of an evening
-- it could not even see.
--
-- The policies below are the `gameplay` half of the RBAC migration, written out
-- by hand rather than generated: a phase is banked one row at a time while the
-- evening runs (`bankPhase`, called from `endPhase` and when a stage closes),
-- and never as part of creating a game — so INSERT stays strictly on the
-- parent's status and does not answer to `games.create`.
--
-- `game_is_ongoing` is SECURITY DEFINER on purpose (see its own comment): read
-- plainly, a game the caller cannot see would answer « not ongoing » and route
-- him to the wrong permission.
--
-- Dropped first so the file can be replayed — it is applied to production by
-- hand.

drop policy if exists game_phases_read on public.game_phases;
drop policy if exists game_phases_insert on public.game_phases;
drop policy if exists game_phases_update on public.game_phases;
drop policy if exists game_phases_delete on public.game_phases;

create policy game_phases_read on public.game_phases
  for select to authenticated
  using ((select public.has_permission('games.read')));

create policy game_phases_insert on public.game_phases
  for insert to authenticated
  with check (
    case
      when public.game_is_ongoing(game_id)
        then (select public.has_permission('games.updateLive'))
      else (select public.has_permission('games.updateDone'))
    end
  );

create policy game_phases_update on public.game_phases
  for update to authenticated
  using (
    case
      when public.game_is_ongoing(game_id)
        then (select public.has_permission('games.updateLive'))
      else (select public.has_permission('games.updateDone'))
    end
  )
  with check (
    case
      when public.game_is_ongoing(game_id)
        then (select public.has_permission('games.updateLive'))
      else (select public.has_permission('games.updateDone'))
    end
  );

create policy game_phases_delete on public.game_phases
  for delete to authenticated
  using (
    case
      when public.game_is_ongoing(game_id)
        then (select public.has_permission('games.updateLive'))
      else (select public.has_permission('games.updateDone'))
    end
  );
