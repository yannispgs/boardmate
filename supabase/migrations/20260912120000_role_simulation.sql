-- Seeing the application as a role, without becoming somebody else.
--
-- The question this answers is « what does a Joueur actually see? ». Hiding
-- controls in the interface would only be a drawing: the policies answer to the
-- real `auth.uid()`, so a screen pretending to be narrower would still let every
-- write through and would lie the first time the two disagreed. The honest
-- place is therefore the database, and the narrowest possible cut of it —
-- `has_permission()` is the single door all 38 policies already walk through.
--
-- The rule that makes this safe is that a simulation can only ever SHRINK:
-- the simulated set is INTERSECTED with what the caller really holds. Nobody
-- can reach a right by asking for it. Two things follow, and both are load
-- bearing:
--
--   * the `is_admin` shortcut is deliberately *not* re-offered to a simulation.
--     Only explicit `role_permissions` rows count, so simulating a role can
--     never restore the blanket grant the caller is trying to step out of.
--   * an administrator role is refused at the door. It carries no explicit
--     rows at all (`is_admin` *is* its grant), so simulating it would produce
--     an empty application — a misleading answer to an already pointless
--     question, since the caller is that role.
--
-- The danger here is not escalation, it is the opposite: locking yourself out.
-- Simulating « Joueur » takes `roles.update` away, so the account can no longer
-- write the very row that holds it captive. `stop_role_simulation()` therefore
-- asks for NO permission and only ever touches the caller's own row, and every
-- simulation carries an expiry so that a forgotten one repairs itself.

create table if not exists public.permission_simulations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role_ids uuid[] not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null
);

comment on table public.permission_simulations is
  'One optional row per account: the roles it is currently looking through, and when that stops. Written only by start/stop_role_simulation().';

alter table public.permission_simulations enable row level security;

-- No policy, and no privilege either. Every read and write goes through the
-- SECURITY DEFINER functions below, which is what lets them hold the invariants
-- (intersection, no administrator role, an always-available way out) in one
-- place instead of restating them as policy expressions.
--
-- ⚠️ The revoke is not belt-and-braces: `20260612201714_grant_table_privileges`
-- leaves an `alter default privileges` behind, so a new table is granted DML to
-- anon and authenticated the moment it is created. Without this, the table
-- would sit on RLS alone, exactly like `auth_rate_limits`.
revoke all on public.permission_simulations from anon, authenticated;

/**
 * What the account really holds, simulation or not.
 *
 * This is `has_permission()` as it stood before simulations existed, moved
 * aside under its own name. Two callers need the unfiltered truth: the
 * intersection below, which has nothing to intersect without it, and the guard
 * on starting a simulation — otherwise simulating a role without `roles.read`
 * would take away the ability to change or extend the simulation.
 */
create or replace function public.has_real_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.is_admin
  ) or exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = (select auth.uid())
      and rp.permission_key = p_key
  );
$$;

/**
 * The roles the caller is currently looking through, or NULL when he is simply
 * himself. An expired row reads as no simulation at all, so the way out never
 * depends on anybody remembering to take it.
 */
create or replace function public.simulated_role_ids()
returns uuid[]
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select ps.role_ids
  from public.permission_simulations ps
  where ps.user_id = (select auth.uid())
    and ps.expires_at > now();
$$;

/**
 * The gate every policy asks. Unchanged when nothing is being simulated; an
 * intersection when something is.
 *
 * Note what the simulated half reads: `role_permissions` rows only. A role's
 * `is_admin` flag is not consulted, which is what stops a simulation from
 * handing back the blanket grant.
 */
create or replace function public.has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.has_real_permission(p_key)
    and (
      public.simulated_role_ids() is null
      or exists (
        select 1
        from public.role_permissions rp
        where rp.role_id = any (public.simulated_role_ids())
          and rp.permission_key = p_key
      )
    );
$$;

/**
 * The same answer for the whole catalogue at once, so the interface can hide
 * what the policies are about to refuse. It has to go through the simulation
 * too: a screen still offering « Nouveau jeu » under a simulated Joueur would
 * be the drawing this feature exists not to be.
 */
create or replace function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with real as (
    select p.key as key
    from public.permissions p
    where exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = (select auth.uid())
        and r.is_admin
    )
    union
    select distinct rp.permission_key as key
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = (select auth.uid())
  )
  select real.key
  from real
  where public.simulated_role_ids() is null
     or exists (
       select 1
       from public.role_permissions rp
       where rp.role_id = any (public.simulated_role_ids())
         and rp.permission_key = real.key
     );
$$;

/**
 * Starts, replaces or extends a simulation, and answers when it will lapse.
 *
 * Guarded on the REAL `roles.read`: whoever may read the grid may preview it,
 * and a simulation is never what grants the right to change the simulation.
 */
create or replace function public.start_role_simulation(p_role_ids uuid[])
returns timestamptz
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_expires_at timestamptz := now() + interval '15 minutes';
begin
  if v_user_id is null then
    raise exception 'Authentification requise';
  end if;

  if not public.has_real_permission('roles.read') then
    raise exception 'Permission « Consulter les rôles » requise';
  end if;

  if p_role_ids is null or cardinality(p_role_ids) = 0 then
    raise exception 'Choisis au moins un rôle à simuler';
  end if;

  if exists (
    select 1
    from unnest(p_role_ids) as wanted (id)
    where not exists (select 1 from public.roles r where r.id = wanted.id)
  ) then
    raise exception 'Rôle inconnu';
  end if;

  -- An administrator role grants by being one, never by listing rights, so
  -- simulating it would empty the application instead of narrowing it.
  if exists (
    select 1 from public.roles r
    where r.id = any (p_role_ids) and r.is_admin
  ) then
    raise exception 'Un rôle administrateur ne se simule pas';
  end if;

  insert into public.permission_simulations (user_id, role_ids, expires_at)
  values (v_user_id, p_role_ids, v_expires_at)
  on conflict (user_id) do update
    set role_ids = excluded.role_ids,
        started_at = now(),
        expires_at = excluded.expires_at;

  return v_expires_at;
end;
$$;

/**
 * The way out. Asks for nothing and reaches no further than the caller's own
 * row — which is the whole point: the account that most needs this is the one
 * whose simulation just took its rights away.
 */
create or replace function public.stop_role_simulation()
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  delete from public.permission_simulations
  where user_id = (select auth.uid());
$$;

/**
 * What is being simulated right now, for the banner to say so.
 *
 * The labels come back with the ids on purpose. Simulating « Joueur » takes
 * `roles.read` away, so the screen that has to name the role is precisely the
 * screen that may no longer read the roles table — a banner reduced to « Vue
 * simulée » with no name would be least useful exactly when it matters most.
 * This function is SECURITY DEFINER, so it can say the name without handing
 * over a read on the grid.
 */
create or replace function public.current_role_simulation()
returns table (
  role_ids uuid[],
  role_labels text[],
  started_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    ps.role_ids,
    coalesce(
      (
        select array_agg(r.label order by r.label)
        from public.roles r
        where r.id = any (ps.role_ids)
      ),
      array[]::text[]
    ),
    ps.started_at,
    ps.expires_at
  from public.permission_simulations ps
  where ps.user_id = (select auth.uid())
    and ps.expires_at > now();
$$;

-- ⚠️ `from public` first, and it is not redundant: Postgres grants EXECUTE on
-- every new function to the PUBLIC pseudo-role, which `revoke … from anon`
-- leaves entirely alone. Without this line an anonymous visitor still reaches
-- all five — `start_role_simulation` only refuses him because it checks
-- `auth.uid()` itself, which is one guard too few for a writing function.
revoke execute on function public.has_real_permission(text) from public;
revoke execute on function public.simulated_role_ids() from public;
revoke execute on function public.start_role_simulation(uuid[]) from public;
revoke execute on function public.stop_role_simulation() from public;
revoke execute on function public.current_role_simulation() from public;

revoke execute on function public.has_real_permission(text) from anon;
revoke execute on function public.simulated_role_ids() from anon;
revoke execute on function public.start_role_simulation(uuid[]) from anon;
revoke execute on function public.stop_role_simulation() from anon;
revoke execute on function public.current_role_simulation() from anon;

grant execute on function public.has_real_permission(text) to authenticated;
grant execute on function public.simulated_role_ids() to authenticated;
grant execute on function public.start_role_simulation(uuid[]) to authenticated;
grant execute on function public.stop_role_simulation() to authenticated;
grant execute on function public.current_role_simulation() to authenticated;
