-- Record per-turn overtime: the active seconds a player took *beyond* the
-- allotted turn duration (the timer keeps counting up once it hits zero). This
-- is a subset of duration_s (the part over the limit), stored so the end-of-game
-- stats can show overtime per player. Zero when the player finished in time.
alter table public.game_turns
  add column overtime_s int not null default 0 check (overtime_s >= 0);
