-- `service_role` was left without DML on `public`.
--
-- Supabase's own defaults hand it `arwdDxtm` on every schema it sets up; in
-- `public` our side ended up with `Dxtm` only — truncate, references, trigger,
-- and none of select/insert/update/delete. The symptom is a bare « permission
-- denied for table players » from a client that is supposed to be able to do
-- anything, which is confusing precisely because it looks like an RLS refusal
-- and is not one: RLS filters silently, a missing GRANT shouts.
--
-- It matters more now than it did last week. Until RBAC, a test fixture could
-- seed through any authenticated account; from now on seeding a role or an
-- assignment is exactly what an authenticated account must NOT be able to do, so
-- the fixtures go through `service_role` — and it has to be allowed to.
--
-- No new power is being handed out: `service_role` already bypasses RLS by
-- design, its key never reaches the browser (it lives in CI/Vercel secrets), and
-- the application itself signs in as `authenticated`. This restores the intent,
-- it does not widen it.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public
  to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
