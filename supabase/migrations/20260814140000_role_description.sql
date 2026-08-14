-- A role gets a sentence saying what it is for.
--
-- « Gestionnaire » names a role; it does not say what one is trusted with. The
-- permission keys underneath answer that, but only to somebody who already
-- knows what `boardgames.updateScoring` covers — and the screen that hands out
-- rights is exactly the wrong place to have to work that out.
--
-- Nullable on purpose: the roles that already exist have no sentence, and
-- refusing to save one until it is written would turn a rename into a chore.
alter table public.roles
  add column description text;

-- 150 characters, the app's own limit, restated where it is actually enforced.
-- A `maxLength` on an input is a courtesy to whoever types; it is not a
-- constraint — anything speaking to PostgREST directly ignores it (OWASP A03).
alter table public.roles
  add constraint roles_description_length
  check (description is null or char_length(description) <= 150);

-- The one role the application ships explains itself, rather than being the
-- only one on the screen with nothing under its name.
update public.roles
set description = 'Détient toutes les permissions, y compris celles ajoutées plus tard. Ni le rôle ni son attribution ne se retirent depuis l''application.'
where key = 'admin';
