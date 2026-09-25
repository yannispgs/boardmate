-- The three write permissions of the « Extensions & scénarios » section say
-- « extensions » and mean « scenarios ».
--
-- They were named after the section, not after what they gate. Read the policies
-- and the gap is plain: `extensions.create`, `extensions.update` and
-- `extensions.delete` are read by the insert, update and delete policies of
-- `public.extension_scenarios` and by nothing else. The `public.extensions`
-- table itself is never written from the app — extensions arrive by migration —
-- so no write permission could ever name it honestly. Their own labels have said
-- « scénario » since the day they were seeded.
--
-- The screen that composes a role shows the key, not only the label, so the
-- mismatch is read by the very person the catalogue is written for: a box
-- labelled « Supprimer un scénario » sitting under a key that says otherwise.
--
-- `extensions.read` is NOT renamed. It is the one key of the section that does
-- gate both tables — the extension list and the scenarios inside it — so its
-- name is already the true one.
--
-- The primary key of `permissions` is the key itself and `role_permissions`
-- points at it without `on update cascade`, so the rename is done by hand in
-- three steps rather than by an `update`: seed the new keys, carry every role
-- that held the old one over to it, then drop the old ones. A role must come out
-- of this migration holding exactly what it held going in.

insert into public.permissions (key, section, action, label, sort_order) values
  ('scenarios.create', 'Extensions & scénarios', 'create', 'Ajouter un scénario',  30),
  ('scenarios.update', 'Extensions & scénarios', 'update', 'Modifier un scénario', 32),
  ('scenarios.delete', 'Extensions & scénarios', 'delete', 'Supprimer un scénario', 33);

-- Carried over, not re-decided. Whatever the owner ticked keeps meaning the same
-- thing under the new name.
insert into public.role_permissions (role_id, permission_key)
select rp.role_id, replace(rp.permission_key, 'extensions.', 'scenarios.')
  from public.role_permissions rp
 where rp.permission_key in ('extensions.create', 'extensions.update', 'extensions.delete')
on conflict do nothing;

-- Takes the old `role_permissions` rows with it, by cascade.
delete from public.permissions
 where key in ('extensions.create', 'extensions.update', 'extensions.delete');

-- Same rules, new names. The guards that surround the permission are unchanged:
-- an official scenario comes from the rulebook and stays uncreatable and
-- undeletable whoever is asking, and « may update » still covers the official
-- ones on purpose — a typo in a seeded scenario is fixed by someone who holds
-- the key, not by a migration.
drop policy if exists extension_scenarios_insert on public.extension_scenarios;
drop policy if exists extension_scenarios_update on public.extension_scenarios;
drop policy if exists extension_scenarios_delete on public.extension_scenarios;

create policy extension_scenarios_insert on public.extension_scenarios
  for insert to authenticated
  with check (not is_official and (select public.has_permission('scenarios.create')));

create policy extension_scenarios_update on public.extension_scenarios
  for update to authenticated
  using ((select public.has_permission('scenarios.update')))
  with check ((select public.has_permission('scenarios.update')));

create policy extension_scenarios_delete on public.extension_scenarios
  for delete to authenticated
  using (not is_official and (select public.has_permission('scenarios.delete')));
