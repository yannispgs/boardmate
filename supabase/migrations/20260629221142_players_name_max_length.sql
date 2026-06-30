-- Cap player names at 20 characters. This is a friendly app that uses first
-- names / nicknames, never full names, so 20 is ample — and a hard bound keeps
-- display and layout simple everywhere a name is shown. The form also sets
-- maxLength=20 for an immediate limit; this is the DB-side guarantee (defense in
-- depth). Existing data already fits (checked before shipping).
alter table public.players
  add constraint players_name_max_length check (char_length(name) <= 20);
