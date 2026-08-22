-- Phases inside a stage, and the time the table spends in each.
--
-- A « Génération » of Terraforming Mars is not one block of time. The table
-- draws and drafts its cards all at once, then goes round one by one playing
-- projects, then resolves production together. Only the middle part has turns;
-- putting the per-player countdown on the other two would be timing a phase
-- nobody takes turns in.
--
-- So a stage is described as an ordered list of phases, each carrying the clock
-- it wants — and it lives in the boardgame's data, not in code keyed on the
-- game's name. Two games need it today (Terraforming Mars, and L'Île des Chats
-- once it exists) and the shape was agreed for a third.

-- ---------------------------------------------------------------------------
-- 1. The phases of a stage, on the boardgame
-- ---------------------------------------------------------------------------
alter table public.boardgames
  add column if not exists phases jsonb;

comment on column public.boardgames.phases is
  'PhaseSpec[] — [{ "key", "label", "mode": "simultaneous" | "sequential", '
  '"clock": "stopwatch" | "turnTimer" | "none", "draft"? }] in play order. '
  'Null for a game whose stage is one undifferentiated block, which is every '
  'game but Terraforming Mars and L''Île des Chats. Reference data, authored '
  'here: the boardgame editor does not offer it, for the same reason it does '
  'not offer "stages" — it is the rulebook, not a preference.';

-- Terraforming Mars, base game. The owner''s own list (2026-08-18): the two
-- remaining phases of the rulebook are folded into these three in the base box,
-- so three is the whole generation, not a simplification of it.
--
-- One word each (owner, 2026-08-22): the strip is read on a phone, where
-- « Réalisation des projets » wrapped the pill onto two lines and pushed the
-- third phase onto a second row. The rank above the name carries the ordering,
-- so the name only has to name.
--
-- ⚠️ Merged with `||`, never written as a fresh row: the game''s line has been
-- hand-edited in the editor on prod, and rewriting it would silently drop what
-- was typed there — the trap Papayoo and Splendor both walked into.
update public.boardgames
set phases = '[
  {
    "key": "discovery",
    "label": "Découverte",
    "mode": "simultaneous",
    "clock": "stopwatch",
    "draft": { "configKey": "draft", "oddStage": "right" }
  },
  {
    "key": "projects",
    "label": "Projets",
    "mode": "sequential",
    "clock": "turnTimer"
  },
  {
    "key": "production",
    "label": "Production",
    "mode": "simultaneous",
    "clock": "stopwatch"
  }
]'::jsonb
where name = 'Terraforming Mars';

-- ---------------------------------------------------------------------------
-- 2. Drafting is a variant, so the game''s configuration decides
-- ---------------------------------------------------------------------------
-- Without the box ticked nothing about the draft shows at all — no direction,
-- no banner. Appended rather than assigned, so the three turn-timer fields
-- already configured on this game survive; `not exists` keeps the file
-- replayable, since it is applied to production by hand.
update public.config_templates as t
set fields = t.fields || '[
  {
    "key": "draft",
    "type": "boolean",
    "label": "Pioche en mode draft",
    "default": false
  }
]'::jsonb
from public.boardgames as b
where b.id = t.boardgame_id
  and b.name = 'Terraforming Mars'
  and not exists (
    select 1
    from jsonb_array_elements(t.fields) as f
    where f->>'key' = 'draft'
  );

-- ---------------------------------------------------------------------------
-- 3. Where the game currently stands inside its stage
-- ---------------------------------------------------------------------------
-- Zero-based index into the boardgame''s phase list, mirroring `games.stage`.
-- Every game gets the column, including the ones with no phases at all, where
-- it simply never moves off zero — a nullable column would only mean the same
-- thing in a way every reader has to handle.
alter table public.games
  add column if not exists phase integer not null default 0;

comment on column public.games.phase is
  'Index of the current phase in boardgames.phases, 0-based. Always 0 for a '
  'game whose boardgame declares no phases.';

-- ---------------------------------------------------------------------------
-- 4. How long each phase actually took
-- ---------------------------------------------------------------------------
-- One row per phase per stage: the **table**''s time, which is a different
-- measure from `game_turns.duration_s` and deliberately not summable with it.
-- A turn belongs to the player who took it; a simultaneous phase belongs to
-- everybody at once, so the two answer different questions ("who is slow" vs.
-- "where does the evening go") and must never be added together.
--
-- The sequential phases are recorded here too, even though their turns are
-- already timed one by one: the phase''s envelope includes what happens between
-- the turns — shuffling, arguing, reading a card out loud — which no sum of
-- turns will ever contain.
create table if not exists public.game_phases (
  game_id    uuid    not null references public.games (id) on delete cascade,
  stage      integer not null,
  phase_key  text    not null,
  duration_s integer not null default 0,
  primary key (game_id, stage, phase_key)
);

create index if not exists game_phases_game_idx
  on public.game_phases (game_id);

comment on column public.game_phases.duration_s is
  'Seconds the table spent in this phase of this stage — a table-wide '
  'envelope, never comparable with a per-player turn duration.';

-- Same access model as the rest: authenticated read/write, anon denied by RLS
-- even though the grant is permissive. The policies are dropped first so the
-- file can be replayed — it is applied to production by hand.
alter table public.game_phases enable row level security;

drop policy if exists game_phases_read on public.game_phases;
drop policy if exists game_phases_insert on public.game_phases;
drop policy if exists game_phases_update on public.game_phases;
drop policy if exists game_phases_delete on public.game_phases;

create policy game_phases_read on public.game_phases
  for select to authenticated using (true);
create policy game_phases_insert on public.game_phases
  for insert to authenticated with check (true);
create policy game_phases_update on public.game_phases
  for update to authenticated using (true) with check (true);
create policy game_phases_delete on public.game_phases
  for delete to authenticated using (true);

grant select, insert, update, delete on public.game_phases
  to anon, authenticated;
