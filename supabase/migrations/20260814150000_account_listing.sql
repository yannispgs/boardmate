-- Who the roles can be handed to.
--
-- The assignment itself already exists: `user_roles` carries its policies since
-- the RBAC foundation — `roles.assign` to write, and an administrator role
-- neither given nor taken back from the app. What was missing is the other half
-- of the sentence: the app has no way to name an account. `auth.users` belongs
-- to the authentication schema, which PostgREST does not expose and must not —
-- it holds password hashes, recovery tokens and confirmation secrets.
--
-- Hence a function that hands over the three columns the screen needs, and
-- nothing else. SECURITY DEFINER because reading `auth.users` is exactly the
-- privilege the caller does not have, `search_path` pinned because an unpinned
-- definer function resolves its table names against whatever schema the caller
-- puts first — which hands the owner's rights to anyone who can create one.
--
-- The permission is checked INSIDE the function: a definer function runs past
-- RLS, so being allowed to execute it is not the same as being allowed to read
-- what it returns. It answers with no rows rather than an error, the same
-- silence RLS itself keeps everywhere else in this schema — the screen is what
-- says « tu n'as pas le droit d'y jeter un œil », in words.
--
-- `roles.read` and not `roles.assign`: seeing who wears what is reading the
-- access model, and the screen that lists the roles is the screen that lists
-- the accounts. Handing one over stays `roles.assign`, in the policy that
-- already says so.
create function public.accounts()
returns table (
  user_id          uuid,
  email            text,
  last_sign_in_at  timestamptz,
  created_at       timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id, u.email::text, u.last_sign_in_at, u.created_at
  from auth.users u
  where (select public.has_permission('roles.read'))
    -- A deleted account keeps its row for a while, and it is nobody to hand a
    -- role to.
    and u.deleted_at is null
  order by u.email;
$$;

comment on function public.accounts() is
  'The accounts a role may be handed to: identity only, never the '
  'authentication secrets sitting next to it. Returns nothing without '
  'roles.read.';

-- `from public` and not just `from anon`: Postgres grants EXECUTE on a new
-- function to PUBLIC, and revoking a role that only ever inherited it that way
-- takes nothing away. The permission check inside would answer « no rows » to an
-- anonymous caller anyway — this is the lock in front of that answer.
revoke execute on function public.accounts() from public;
revoke execute on function public.accounts() from anon;
grant execute on function public.accounts() to authenticated;
