-- Record pauses per turn. A pause counts only if it lasted at least 5 seconds
-- (short accidental taps are ignored, enforced client-side). Storing the count
-- and the total paused time on the turn row keeps "which turn a pause happened
-- during" implicit — the row already carries the round and the player.
alter table public.game_turns
  add column pause_count int not null default 0 check (pause_count >= 0),
  add column pause_duration_s int not null default 0 check (pause_duration_s >= 0);
