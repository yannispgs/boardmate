-- Wingspan's « manches », and the Oceania extension that bends them.
--
-- A game of Wingspan is four manches long, each a fixed number of laps of the
-- table — 8, then 7, 6 and 5 — and each set up with one end-of-manche goal tile
-- laid face up before anyone plays. Oceania adds tiles to that pool, one of
-- which is « Pas d'objectif »: it scores nothing, and because its action cube is
-- never spent on the goal board it comes back to stock, giving everyone one
-- extra lap in every FOLLOWING manche.
--
-- So the calendar is not a property of the box: 8/7/6/5 is only what you get
-- when all four tiles score. It is decided at setup, once the four tiles are
-- known, which is why it is written per GAME (`game_stages.turns`) rather than
-- per boardgame. `boardgames.stages.schedule` keeps the base, and the effect is
-- a property of the goal in the catalogue (`extraTurn`), never an `if oceania`.

-- ---------------------------------------------------------------------------
-- 1. A stage spec now says how a stage ENDS
-- ---------------------------------------------------------------------------
-- Terraforming Mars and Wingspan both play in stages, and both call them
-- something ("Génération", "Manche"). They differ in what closes one: players
-- passing one by one, or a counted number of laps. That distinction used to be
-- implicit — having a `stages` at all meant generations — which would have made
-- Wingspan grow a « Passe » button it has no rule for.
update public.boardgames
set stages = stages || '{ "advance": "pass" }'::jsonb
where stages is not null;

update public.boardgames
set stages = '{
  "label": "Manche",
  "advance": "schedule",
  "schedule": [8, 7, 6, 5]
}'::jsonb
where name = 'Wingspan';

comment on column public.boardgames.stages is
  'StageSpec — { "label", "advance": "pass" | "schedule", "schedule": int[] }. '
  'Null for a game turning in plain laps.';

-- ---------------------------------------------------------------------------
-- 2. The calendar of one game
-- ---------------------------------------------------------------------------
-- One row per manche, written at launch: the goal tile it was set up with, the
-- values of that tile's parameters, and how many laps it ends up lasting.
--
-- `goal_key` and `goal_params` are kept APART on purpose, never concatenated:
-- grouping on the key alone reads « the eggs-per-habitat family », grouping on
-- both reads « eggs in the sea ». A single `eggsInHabitat:sea` column would
-- close the first door for good.
create table if not exists public.game_stages (
  game_id     uuid    not null references public.games (id) on delete cascade,
  stage       integer not null,
  goal_key    text    not null,
  goal_params jsonb   not null default '{}'::jsonb,
  turns       integer not null,
  primary key (game_id, stage)
);

comment on column public.game_stages.turns is
  'Laps of the table this manche lasts — the base schedule plus one per '
  '« no goal » tile in an EARLIER manche.';

-- ---------------------------------------------------------------------------
-- 3. What each player scored on each goal
-- ---------------------------------------------------------------------------
-- Entered at the end of the manche it belongs to, while the birds are still on
-- the table. The app embarks no barème — the green tiles pay by ranking and the
-- values differ per manche — so the table enters the POINTS, not the count.
create table if not exists public.game_stage_scores (
  game_id   uuid    not null references public.games (id) on delete cascade,
  stage     integer not null,
  player_id uuid    not null references public.players (id),
  points    integer not null default 0,
  primary key (game_id, stage, player_id)
);

create index if not exists game_stage_scores_game_idx
  on public.game_stage_scores (game_id);

-- Same access model as the rest: authenticated read/write, anon denied by RLS
-- even though the grant is permissive. The policies are dropped first so the
-- file can be replayed — it is applied to production by hand.
alter table public.game_stages enable row level security;
alter table public.game_stage_scores enable row level security;

drop policy if exists game_stages_read on public.game_stages;
drop policy if exists game_stages_insert on public.game_stages;
drop policy if exists game_stages_update on public.game_stages;
drop policy if exists game_stages_delete on public.game_stages;

create policy game_stages_read on public.game_stages
  for select to authenticated using (true);
create policy game_stages_insert on public.game_stages
  for insert to authenticated with check (true);
create policy game_stages_update on public.game_stages
  for update to authenticated using (true) with check (true);
create policy game_stages_delete on public.game_stages
  for delete to authenticated using (true);

drop policy if exists game_stage_scores_read on public.game_stage_scores;
drop policy if exists game_stage_scores_insert on public.game_stage_scores;
drop policy if exists game_stage_scores_update on public.game_stage_scores;
drop policy if exists game_stage_scores_delete on public.game_stage_scores;

create policy game_stage_scores_read on public.game_stage_scores
  for select to authenticated using (true);
create policy game_stage_scores_insert on public.game_stage_scores
  for insert to authenticated with check (true);
create policy game_stage_scores_update on public.game_stage_scores
  for update to authenticated using (true) with check (true);
create policy game_stage_scores_delete on public.game_stage_scores
  for delete to authenticated using (true);

grant select, insert, update, delete on public.game_stages
  to anon, authenticated;
grant select, insert, update, delete on public.game_stage_scores
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Wingspan's sheet: nectar leaves, the goals line becomes a total
-- ---------------------------------------------------------------------------
-- « Nectar » was seeded on the base game by mistake — it is an Oceania food and
-- exists nowhere in the base box. It moves to the extension, which appends it
-- to the sheet only for the games actually played with Oceania. Safe to move
-- outright: no game of Wingspan has ever been recorded (checked on both
-- projects), so there is no breakdown keyed `nectar` to preserve.
--
-- « Objectifs de manche » stops being typed at the end: the points were already
-- entered manche by manche, so the line is now DERIVED from them — shown filled
-- in and read-only on the final sheet.
update public.boardgames
set scoring = jsonb_set(scoring, '{sheet}', '[
  { "key": "oiseaux", "label": "Oiseaux" },
  { "key": "objectifsManche", "label": "Objectifs de manche", "derived": "stageGoals" },
  { "key": "oeufs", "label": "Œufs" },
  { "key": "cartesObjectif", "label": "Cartes objectif" },
  { "key": "nourritureStockee", "label": "Jetons nourriture stockés" },
  { "key": "cartesRecouvertes", "label": "Cartes recouvertes" }
]'::jsonb)
where name = 'Wingspan';

update public.extensions
set scoring_delta = '{ "appendSheet": [{ "key": "nectar", "label": "Nectar" }] }'::jsonb,
    is_active = true
where name = 'Wingspan - Océanie';
