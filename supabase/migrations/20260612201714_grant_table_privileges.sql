-- Table-level privileges for the PostgREST API roles.
--
-- Supabase's LOCAL stack grants DML on public tables to anon/authenticated by
-- default, but a hosted project whose schema is created purely via `db push`
-- may not — yielding "permission denied for table" (42501) for authenticated
-- requests even though RLS policies are in place. Grant explicitly so that RLS
-- (not the absence of a grant) is the access gate, identically on local and
-- hosted. RLS still governs which rows each role may actually touch.
--
-- Idempotent: re-running these grants is a no-op.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
