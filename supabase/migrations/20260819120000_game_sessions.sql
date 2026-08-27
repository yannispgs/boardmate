-- Groups the parties dealt one after another into a session.
--
-- An evening of Papayoo is a dozen deals, and the list showed a dozen
-- indistinguishable lines. What the table remembers is the evening, so the
-- parties dealt from the score sheet now carry the same session, and the list
-- folds them into one row.
--
-- `not null default gen_random_uuid()` rather than a nullable column, so a
-- session is never a special case: EVERY party has one, a party played on its
-- own is simply a session of one, and the list has a single rule to follow
-- instead of two. It also spares the app a second write — chaining copies the
-- parent's session instead of having to stamp a session onto a party that is
-- already recorded.
--
-- The default is volatile, so Postgres rewrites the table and draws a distinct
-- id per existing row: every party already played becomes its own session,
-- which is exactly what it was.
--
-- No new policy: `games` is already covered row-wide, and a session is a column
-- of it rather than a table of its own — there is nothing to own, nothing to
-- name, and nothing to delete separately.

alter table public.games
  add column session_id uuid not null default gen_random_uuid();

create index if not exists games_session_id_idx
  on public.games (session_id);

comment on column public.games.session_id is
  'The sitting this party belongs to. Parties dealt one after another from the '
  'score sheet share it, so the list can fold an evening of short games into a '
  'single row. Every party has one; a party played on its own is a session of '
  'one. Purely a grouping: a session has no winner and no cumulative score.';
