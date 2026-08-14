-- Composing a role from the app, and the one guard that makes it safe.
--
-- The policies for all four operations already exist; what was missing is the
-- rule the owner stated when he asked for the screen: a role that somebody
-- still wears cannot be deleted. Editing one stays allowed — adjusting what a
-- role hands out without reassigning it to everybody is the whole point of
-- having roles.
--
-- This has to live in the database, not in the button. `user_roles.role_id`
-- references `roles` **on delete cascade**, so a delete that slipped through
-- would not fail: it would quietly strip the role off every account holding it,
-- and the only trace left would be people wondering why they lost their rights.

create function public.enforce_role_unassigned_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  wearers integer;
begin
  -- Same door as the other guards: the app connects as `authenticated`, a hand
  -- on the database does not, and the database is where exceptional surgery is
  -- meant to happen.
  if current_setting('role', true) is distinct from 'authenticated' then
    return old;
  end if;

  -- SECURITY DEFINER earns its keep here: `user_roles` is behind RLS, so the
  -- same count asked as the caller would answer « nobody » to anyone who cannot
  -- read the assignments — and the guard would open exactly for the accounts it
  -- exists to stop.
  select count(*) into wearers from public.user_roles where role_id = old.id;

  if wearers > 0 then
    raise exception
      'le rôle « % » est attribué à % compte(s) : retire-le avant de le supprimer',
      old.label, wearers
      using errcode = 'check_violation';
  end if;

  return old;
end;
$$;

revoke execute on function public.enforce_role_unassigned_on_delete()
  from anon, authenticated;

-- Fires before `roles_system_kept`, alphabetically, which is fine: both refuse,
-- and a system role that is also assigned deserves either message.
create trigger roles_unassigned_on_delete
  before delete on public.roles
  for each row execute function public.enforce_role_unassigned_on_delete();
