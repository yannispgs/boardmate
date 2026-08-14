-- Role-based access control: who may do what, decided in the database.
--
-- Until now every policy read `to authenticated using (true)`: one account, all
-- powers. Anybody who could log in could rewrite a scoring spec — which silently
-- rewrites every past game's stats — delete a FAQ entry, or remove a player.
-- There was no line between playing and administering.
--
-- The model is deliberately plain:
--   permissions      the catalogue, authored HERE in code; one row per (section,
--                    action). A permission that no policy reads is a lie, so it
--                    only exists once the policy that honours it does.
--   roles            named bundles the owner composes himself in the app.
--   role_permissions which permission each role carries.
--   user_roles       which roles each account carries — several per account, the
--                    effective rights being their union.
--
-- Deny by default: an account with no role can do nothing. That is the point,
-- but it means the screens must SAY so — RLS filters rows silently, so a
-- permission-less account sees an empty app rather than a refusal.

create table public.permissions (
  key         text primary key,
  section     text    not null,
  -- CRUD is the *family*, not the verb. The key carries the verb and may be
  -- finer than CRUD when one operation is dangerous and its neighbour is not
  -- (`games.updateLive` vs `games.updateDone`); `action` says which of the four
  -- families it belongs to, which is what the grid colours and sorts by. Owner's
  -- rule (2026-08-14): « base-toi sur du CRUD mais élargis-le au besoin, comme
  -- les permissions IAM de GCP ».
  action      text    not null check (action in ('create', 'read', 'update', 'delete')),
  -- Read as a description, not a title: the screen shows the key and keeps this
  -- behind an info bubble.
  label       text    not null,
  -- A permission that spends real money on an external service. Such a
  -- permission may only ever be attached to an admin role — enforced below by
  -- trigger, not by remembering to leave the box unticked.
  billable    boolean not null default false,
  sort_order  int     not null default 0
);

comment on table public.permissions is
  'Catalogue of permissions, authored in migrations. Rows are not user-editable: '
  'a permission only means something because a policy reads it.';

create table public.roles (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  label      text not null,
  -- Grants nothing by itself; marks the roles allowed to hold a billable
  -- permission, and the ones the lockout guard below counts.
  is_admin   boolean not null default false,
  -- Seeded here, so the app must not offer to delete them.
  is_system  boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id        uuid not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role_id    uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index user_roles_role_id_idx on public.user_roles (role_id);
create index role_permissions_permission_key_idx
  on public.role_permissions (permission_key);

-- Does the caller hold this permission?
--
-- SECURITY DEFINER for two reasons, not one. The obvious: the caller must be
-- able to resolve his rights without being granted a read on the whole grid.
-- The one that actually forces it: `user_roles` carries an RLS policy that
-- itself calls this function, so a caller-rights version would recurse forever.
-- Running as the owner — who bypasses RLS — breaks the cycle.
--
-- `search_path` is pinned: an unpinned SECURITY DEFINER function resolves its
-- table names against whatever schema the caller puts first, which hands the
-- owner's rights to anyone who can create a schema.
--
-- The argument is a constant at every call site, never a column, so Postgres
-- evaluates this once per statement rather than once per row. Call it wrapped
-- in `(select …)` in policies to make that explicit.
--
-- An `is_admin` role answers yes to everything, without holding a single
-- `role_permissions` row. Owner's rule (2026-08-13): « permet aux admin de tout
-- faire ». Written into the function rather than seeded as rows, because rows
-- would have to be re-seeded by every future migration that adds a permission —
-- and the day one forgets, the account meant to hold them all quietly stops
-- holding one.
create function public.has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
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

-- Every permission the caller holds, for the UI to hide what it must. Hiding a
-- button is comfort, never the gate: the policies above are the gate.
create function public.my_permissions()
returns setof text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.key
  from public.permissions p
  where exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = (select auth.uid())
      and r.is_admin
  )
  union
  select distinct rp.permission_key
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where ur.user_id = (select auth.uid());
$$;

-- Is this role an administrator one? Needed by the delete policy on
-- `user_roles`, which must decide on a role it may not be able to read: a
-- subquery over `public.roles` inside a policy runs under the *caller's* RLS, so
-- a caller who cannot see the row would read « not an admin role » and slip
-- through the guard. SECURITY DEFINER removes that hole.
create function public.is_admin_role(p_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select r.is_admin from public.roles r where r.id = p_role_id),
    false
  );
$$;

-- Is that game still being played? The nine tables hanging off `games` carry a
-- `game_id` and no status of their own, so their policies have to ask the parent
-- which of `games.updateLive` / `games.updateDone` applies. Same reason as
-- `is_admin_role` for the SECURITY DEFINER: read under the caller's RLS, a game
-- he cannot see would answer « not ongoing » and quietly route him to the wrong
-- permission.
--
-- A missing parent answers `false`: there is no row to protect, and the foreign
-- key refuses the write a moment later anyway.
create function public.game_is_ongoing(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select g.status = 'ongoing' from public.games g where g.id = p_game_id),
    false
  );
$$;

revoke execute on function public.has_permission(text) from anon;
revoke execute on function public.my_permissions() from anon;
revoke execute on function public.is_admin_role(uuid) from anon;
revoke execute on function public.game_is_ongoing(uuid) from anon;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.my_permissions() to authenticated;
grant execute on function public.is_admin_role(uuid) to authenticated;
grant execute on function public.game_is_ongoing(uuid) to authenticated;

-- A billable permission belongs to an admin role and nowhere else. Owner's
-- rule (2026-08-13): the features that cost money per use are admin-only. Said
-- once here, it holds for every permission we add later.
create function public.enforce_billable_is_admin_only()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.permissions p
    join public.roles r on r.id = new.role_id
    where p.key = new.permission_key
      and p.billable
      and not r.is_admin
  ) then
    raise exception
      'permission % coûte de l''argent : réservée aux rôles administrateurs',
      new.permission_key
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger role_permissions_billable_is_admin_only
  before insert or update on public.role_permissions
  for each row execute function public.enforce_billable_is_admin_only();

-- An administrator assignment is never taken back from inside the application —
-- not even by another administrator. Owner's rule (2026-08-13): revoking admin
-- goes through the database.
--
-- This is stronger than counting the survivors, and simpler: a rule that says
-- « at least one must remain » still lets the grid be emptied down to one
-- account, which may be the wrong one, and it has to be re-checked on every path
-- that touches the table. « None of them, ever, from the app » has no edge case.
-- It is carried by the delete policy on `user_roles` further down, so the app
-- cannot even express the deletion.
--
-- The consequence, stated plainly: an admin badge handed out by mistake can only
-- be taken back with a hand on the database. That is the trade the owner chose.
--
-- The guard is only worth as much as the flag it reads, so the flag itself is
-- put out of the app's reach here. Without this, the rule has an obvious way
-- round it: flip `is_admin` off, delete the assignment the policy now allows,
-- flip it back. `is_system` travels with it — it protects the seeded role from
-- being dropped, and a protection you can switch off is not one.
create function public.enforce_admin_flag_not_app_writable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- The application connects as `authenticated`; a hand on the database does
  -- not. This is the same door the owner's rule points at.
  if current_setting('role', true) is distinct from 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' and (new.is_admin or new.is_system) then
    raise exception 'un rôle administrateur se crée en base de données'
      using errcode = 'insufficient_privilege';
  end if;

  if tg_op = 'UPDATE'
    and (new.is_admin is distinct from old.is_admin
      or new.is_system is distinct from old.is_system)
  then
    raise exception 'le caractère administrateur d''un rôle se modifie en base de données'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger roles_admin_flag_not_app_writable
  before insert or update on public.roles
  for each row execute function public.enforce_admin_flag_not_app_writable();

-- System roles are seeded by migration; the app may rename them, never drop
-- them, or the grid would lose the rows the seeds below refer to.
create function public.enforce_system_role_kept()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('role', true) is distinct from 'authenticated' then
    return old;
  end if;

  if old.is_system then
    raise exception 'le rôle « % » est fourni par l''application', old.label
      using errcode = 'check_violation';
  end if;

  return old;
end;
$$;

create trigger roles_system_kept
  before delete on public.roles
  for each row execute function public.enforce_system_role_kept();

-- The catalogue. Sections are the owner's: the game catalogue is split in three
-- because rewriting a scoring spec rewrites every past game's statistics while
-- fixing a FAQ typo costs nothing — bundling them would force granting the
-- dangerous one to grant the harmless one.
--
-- ⚠️ `stats.read` is the one permission NO policy can enforce: statistics have
-- no table, they are computed from games / game_players / game_turns. Anyone
-- holding `games.read` can derive them. It gates the screen, and that is all it
-- claims to do.
-- Five keys are finer than CRUD, each because the coarse version would have
-- forced granting something dangerous to grant something harmless:
--   boardgames.updateScoring  rewriting a barème rewrites every past game's
--                             statistics; renaming a game costs nothing.
--   games.updateLive          playing tonight's game.
--   games.updateDone          rewriting a result already in the history.
--   players.disable           taking somebody out of every future selection is
--                             not the same act as fixing a typo in his name.
--   roles.assign              handing a role to somebody is not the same act as
--                             deciding what that role contains.
insert into public.permissions (key, section, action, label, sort_order) values
  ('boardgames.create',        'Jeux & barèmes',        'create', 'Ajouter un jeu',                            10),
  ('boardgames.read',          'Jeux & barèmes',        'read',   'Consulter les jeux',                        11),
  ('boardgames.update',        'Jeux & barèmes',        'update', 'Modifier la fiche d''un jeu',               12),
  ('boardgames.updateScoring', 'Jeux & barèmes',        'update', 'Modifier le barème et les règles d''un jeu', 13),
  ('boardgames.delete',        'Jeux & barèmes',        'delete', 'Supprimer un jeu',                          14),
  ('faq.create',               'FAQ',                   'create', 'Ajouter une question',                      20),
  ('faq.read',                 'FAQ',                   'read',   'Consulter la FAQ',                          21),
  ('faq.update',               'FAQ',                   'update', 'Modifier une question',                     22),
  ('faq.delete',               'FAQ',                   'delete', 'Supprimer une question',                    23),
  ('extensions.create',        'Extensions & scénarios','create', 'Ajouter un scénario',                       30),
  ('extensions.read',          'Extensions & scénarios','read',   'Consulter les extensions',                  31),
  ('extensions.update',        'Extensions & scénarios','update', 'Modifier un scénario',                      32),
  ('extensions.delete',        'Extensions & scénarios','delete', 'Supprimer un scénario',                     33),
  ('players.create',           'Joueurs',               'create', 'Ajouter un joueur',                         40),
  ('players.read',             'Joueurs',               'read',   'Consulter les joueurs',                     41),
  ('players.update',           'Joueurs',               'update', 'Renommer un joueur',                        42),
  ('players.disable',          'Joueurs',               'update', 'Désactiver ou réactiver un joueur',         43),
  ('players.delete',           'Joueurs',               'delete', 'Supprimer un joueur qui n''a jamais joué',  44),
  ('games.create',             'Parties',               'create', 'Lancer une partie et la composer',          50),
  ('games.read',               'Parties',               'read',   'Consulter les parties',                     51),
  ('games.updateLive',         'Parties',               'update', 'Jouer et modifier une partie en cours',     52),
  ('games.updateDone',         'Parties',               'update', 'Corriger une partie terminée',              53),
  ('games.delete',             'Parties',               'delete', 'Supprimer une partie',                      54),
  ('stats.read',               'Statistiques',          'read',   'Consulter les statistiques',                60),
  ('feedback.create',          'Retours',               'create', 'Envoyer un retour',                         70),
  ('feedback.read',            'Retours',               'read',   'Lire les retours',                          71),
  ('feedback.delete',          'Retours',               'delete', 'Supprimer un retour',                       72),
  ('roles.create',             'Administration',        'create', 'Créer un rôle',                             80),
  ('roles.read',               'Administration',        'read',   'Consulter les rôles et les permissions',    81),
  ('roles.update',             'Administration',        'update', 'Modifier les permissions d''un rôle',       82),
  ('roles.assign',             'Administration',        'update', 'Attribuer un rôle à un utilisateur',        83),
  ('roles.delete',             'Administration',        'delete', 'Supprimer un rôle',                         84);

-- One seeded role, and only one. Every other role is the owner's to compose in
-- the administration screen once he has read the catalogue above — a role
-- shipped by migration would be a guess at what he wants, and the grid would
-- start out saying something he never said.
-- No `role_permissions` rows go with it: `is_admin` *is* the grant, resolved in
-- `has_permission` above. The grid renders this role with every box ticked and
-- none of them touchable, which is the truth rather than a copy of it.
insert into public.roles (key, label, is_admin, is_system) values
  ('admin', 'Administrateur', true, true);

-- Bootstrap. Deny by default means somebody has to be able to open the door
-- from the inside, and only an existing account can be it. Guarded by a lookup
-- rather than a hard-coded id: the local stack and CI have no such user, and
-- must not fail this migration.
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u
cross join public.roles r
where u.email = 'ysinaynp34@gmail.com'
  and r.key = 'admin'
on conflict do nothing;

alter table public.permissions      enable row level security;
alter table public.roles            enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;

-- The catalogue is readable by anyone signed in: the grid has to render, and
-- knowing that a permission exists grants nothing. It is never writable from
-- the app — new permissions arrive by migration, with the policy that honours
-- them.
create policy permissions_read on public.permissions
  for select to authenticated using (true);

create policy roles_read on public.roles
  for select to authenticated using ((select public.has_permission('roles.read')));
create policy roles_insert on public.roles
  for insert to authenticated with check ((select public.has_permission('roles.create')));
create policy roles_update on public.roles
  for update to authenticated
  using ((select public.has_permission('roles.update')))
  with check ((select public.has_permission('roles.update')));
create policy roles_delete on public.roles
  for delete to authenticated using ((select public.has_permission('roles.delete')));

create policy role_permissions_read on public.role_permissions
  for select to authenticated using ((select public.has_permission('roles.read')));
create policy role_permissions_insert on public.role_permissions
  for insert to authenticated with check ((select public.has_permission('roles.update')));
create policy role_permissions_delete on public.role_permissions
  for delete to authenticated using ((select public.has_permission('roles.update')));

-- An account always sees its own assignments — that is how the app tells
-- somebody he has no role yet instead of showing him an empty application.
create policy user_roles_read_own on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_roles_read_all on public.user_roles
  for select to authenticated using ((select public.has_permission('roles.read')));
-- Handing out a role is `roles.assign`, not `roles.update`: composing what a
-- role contains and deciding who wears it are two jobs, and the second one is
-- the one that changes what a person can do tonight.
--
-- The admin door is barred in *both* directions, and it has to be: a rule that
-- only stops the removal would let anybody holding `roles.assign` make himself
-- an administrator — and then, by the very rule below, never lose it again.
create policy user_roles_insert on public.user_roles
  for insert to authenticated with check (
    (select public.has_permission('roles.assign'))
    and not public.is_admin_role(role_id)
  );
-- …but an administrator assignment is not his to take back. `is_admin_role`
-- runs as the function owner on purpose (see its comment): asked from here, a
-- plain subquery over `public.roles` would answer « no » to anyone who cannot
-- read the row, and the guard would open instead of closing.
create policy user_roles_delete on public.user_roles
  for delete to authenticated using (
    (select public.has_permission('roles.assign'))
    and not public.is_admin_role(role_id)
  );

grant select, insert, update, delete
  on public.permissions, public.roles, public.role_permissions, public.user_roles
  to authenticated;
grant usage on schema public to anon, authenticated;
