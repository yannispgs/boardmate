-- Per-game snapshot of the effective config values confirmed at launch.
--
-- The launch recap lets the player tweak a game's config attributes — including
-- the score-to-reach (the threshold win condition's field) — for one game only,
-- without editing the reusable config. We persist those effective values here so
-- the game keeps what was actually played even if the source config is later
-- edited or deleted. Null for games created before this column existed and for
-- games launched straight from a config without any tweak-time snapshot.
alter table public.games
  add column config_values jsonb;
