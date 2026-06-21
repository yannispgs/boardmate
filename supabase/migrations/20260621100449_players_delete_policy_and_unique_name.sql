-- Players: allow deletion while a player has no game history, and enforce
-- unique names.
--
-- Deletion: previously players could never be deleted. Now authenticated users
-- may delete a player — but the on-delete-restrict foreign keys from
-- game_players and game_turns make Postgres reject the delete once the player
-- has taken part in a game (history is preserved; deactivate instead). No
-- application-side count is needed: the FK enforces "only if never played".
create policy players_authenticated_delete on public.players
  for delete to authenticated using (true);

-- Unique name, case-insensitive and trim-insensitive, so "Alice", "alice" and
-- " Alice " can't coexist. Enforced in the DB; the UI also checks on submit for
-- a friendly inline message.
create unique index players_name_unique_ci
  on public.players (lower(btrim(name)));
