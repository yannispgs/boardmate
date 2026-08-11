-- Milestones: the fixed rewards a player claims during the game, first come
-- first served (Terraforming Mars « jalons »).
--
-- Nothing in the app attributes a *fixed* number of points to a player yet.
-- Cascadia's `rankBonus` is the nearest thing, but it ranks players against
-- each other at the end; a milestone is the opposite — it is taken mid-game,
-- by one player, and the others can no longer have it. Which is exactly why it
-- is the most miscounted part of a Terraforming Mars game: it happens two hours
-- before anybody counts anything.
--
-- The catalogue is data, not code, because it is not stable: Venus Next adds a
-- sixth milestone, and the Hellas and Elysium boards replace all five.

-- Which milestones this game offers, how many of them a single game may claim,
-- and the scoresheet line they fill in. Null for every game without them.
alter table public.boardgames
  add column if not exists milestones jsonb;

comment on column public.boardgames.milestones is
  'Claimable milestones, as { "label", "points", "max", "scoreKey", '
  '"catalogue": [{ "key", "label", "hint", "icon", "color" }] }. '
  'Null when the game has none.';

-- One row per milestone claimed, in one game, by one player.
--
-- `unique (game_id, milestone_key)` is the rule "one claimer each", kept in the
-- database rather than in the screen: two people tapping at once on two phones
-- is a real way to play, and the second tap has to lose. How many may be
-- claimed in total is *not* enforced here — it would take a trigger, and the
-- count is a rule of the game, not of the data.
--
-- Cascades on the game: a claim is part of a played game, not history of its
-- own. `stage` records the generation it was taken in, for the stats; null for
-- a game not played in generations.
create table if not exists public.game_milestones (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references public.games (id) on delete cascade,
  player_id     uuid not null references public.players (id),
  milestone_key text not null,
  stage         integer,
  created_at    timestamptz not null default now(),
  unique (game_id, milestone_key)
);

create index if not exists game_milestones_game_idx
  on public.game_milestones (game_id);

-- Same access model as the rest: authenticated read/write, anon denied by RLS
-- (no anon policy) even though the grant is permissive. Deletable, because a
-- milestone given to the wrong player has to be takeable back at the table.
--
-- The policies are dropped first so the whole file can be replayed: it is
-- applied to production by hand, and a re-run has to be a no-op.
alter table public.game_milestones enable row level security;

drop policy if exists game_milestones_read on public.game_milestones;
drop policy if exists game_milestones_insert on public.game_milestones;
drop policy if exists game_milestones_update on public.game_milestones;
drop policy if exists game_milestones_delete on public.game_milestones;

create policy game_milestones_read on public.game_milestones
  for select to authenticated using (true);
create policy game_milestones_insert on public.game_milestones
  for insert to authenticated with check (true);
create policy game_milestones_update on public.game_milestones
  for update to authenticated using (true) with check (true);
create policy game_milestones_delete on public.game_milestones
  for delete to authenticated using (true);

grant select, insert, update, delete on public.game_milestones
  to anon, authenticated;

-- The five milestones of the base game (Tharsis board): three of them at most
-- are claimed in a game, 5 VP each, and they fill the sheet's « Jalons » line.
--
-- Each carries one of the app's own drawings, picked for what the milestone
-- *requires* — a city, a greenery, a building, a card, the rating going up —
-- so the five are told apart at a glance, next to the name rather than instead
-- of it. They are not tracings of the printed board.
update public.boardgames
set milestones = '{
  "label": "Jalon",
  "points": 5,
  "max": 3,
  "scoreKey": "jalons",
  "catalogue": [
    { "key": "terraformeur",   "label": "Terraformeur",   "hint": "NT d''au moins 35",          "icon": "terraforming", "color": "#e2703a" },
    { "key": "maire",          "label": "Maire",          "hint": "Posséder 3 cités",           "icon": "city",         "color": "#8b93a7" },
    { "key": "jardinier",      "label": "Jardinier",      "hint": "Posséder 3 espaces verts",   "icon": "tree",         "color": "#4c9a5a" },
    { "key": "batisseur",      "label": "Bâtisseur",      "hint": "8 tags Construction",        "icon": "factory",      "color": "#a87542" },
    { "key": "planificateur",  "label": "Planificateur",  "hint": "16 cartes en main",          "icon": "cards-side",   "color": "#4a86c8" }
  ]
}'::jsonb
where name = 'Terraforming Mars';
