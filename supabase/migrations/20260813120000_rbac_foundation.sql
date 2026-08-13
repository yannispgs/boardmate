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
  action      text    not null check (action in ('create', 'read', 'update', 'delete')),
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
  select distinct rp.permission_key
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where ur.user_id = (select auth.uid());
$$;

revoke execute on function public.has_permission(text) from anon;
revoke execute on function public.my_permissions() from anon;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.my_permissions() to authenticated;

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

-- Never let the last administrator go. Without this, one unticked box or one
-- removed assignment bricks the application for everybody, with no way back
-- through the app itself.
--
-- The service role is exempt, and deliberately so: the guard exists to stop the
-- *app* from locking itself out, and the app only ever runs as `anon` or
-- `authenticated`. Without the exemption a test that seeds an administrator
-- could never tear it down, and an operator holding the keys to the database
-- would have no way to hand the last account over to somebody else.
create function public.enforce_last_admin_survives()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('role', true) = 'service_role' then
    return null;
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where r.is_admin
  ) then
    raise exception 'il doit rester au moins un compte administrateur'
      using errcode = 'check_violation';
  end if;

  return null;
end;
$$;

create constraint trigger user_roles_last_admin_survives
  after delete or update on public.user_roles
  deferrable initially deferred
  for each row execute function public.enforce_last_admin_survives();

-- System roles are seeded by migration; the app may rename them, never drop
-- them, or the grid would lose the rows the seeds below refer to.
create function public.enforce_system_role_kept()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
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
insert into public.permissions (key, section, action, label, sort_order) values
  ('boardgames.create', 'Jeux & barèmes',        'create', 'Ajouter un jeu',                 10),
  ('boardgames.read',   'Jeux & barèmes',        'read',   'Consulter les jeux',             11),
  ('boardgames.update', 'Jeux & barèmes',        'update', 'Modifier un jeu et son barème',  12),
  ('boardgames.delete', 'Jeux & barèmes',        'delete', 'Supprimer un jeu',               13),
  ('faq.create',        'FAQ',                   'create', 'Ajouter une question',           20),
  ('faq.read',          'FAQ',                   'read',   'Consulter la FAQ',               21),
  ('faq.update',        'FAQ',                   'update', 'Modifier une question',          22),
  ('faq.delete',        'FAQ',                   'delete', 'Supprimer une question',         23),
  ('extensions.create', 'Extensions & scénarios','create', 'Ajouter un scénario',            30),
  ('extensions.read',   'Extensions & scénarios','read',   'Consulter les extensions',       31),
  ('extensions.update', 'Extensions & scénarios','update', 'Modifier un scénario',           32),
  ('extensions.delete', 'Extensions & scénarios','delete', 'Supprimer un scénario',          33),
  ('players.create',    'Joueurs',               'create', 'Ajouter un joueur',              40),
  ('players.read',      'Joueurs',               'read',   'Consulter les joueurs',          41),
  ('players.update',    'Joueurs',               'update', 'Modifier un joueur',             42),
  ('players.delete',    'Joueurs',               'delete', 'Supprimer un joueur',            43),
  ('games.create',      'Parties',               'create', 'Lancer une partie',              50),
  ('games.read',        'Parties',               'read',   'Consulter les parties',          51),
  ('games.update',      'Parties',               'update', 'Jouer et modifier une partie',   52),
  ('games.delete',      'Parties',               'delete', 'Supprimer une partie',           53),
  ('stats.read',        'Statistiques',          'read',   'Consulter les statistiques',     60),
  ('feedback.create',   'Retours',               'create', 'Envoyer un retour',              70),
  ('feedback.read',     'Retours',               'read',   'Lire les retours',               71),
  ('feedback.delete',   'Retours',               'delete', 'Supprimer un retour',            72),
  ('roles.create',      'Administration',        'create', 'Créer un rôle',                  80),
  ('roles.read',        'Administration',        'read',   'Consulter les rôles',            81),
  ('roles.update',      'Administration',        'update', 'Modifier un rôle',               82),
  ('roles.delete',      'Administration',        'delete', 'Supprimer un rôle',              83);

insert into public.roles (key, label, is_admin, is_system) values
  ('admin',        'Administrateur', true,  true),
  ('gestionnaire', 'Gestionnaire',   false, true),
  ('joueur',       'Joueur',         false, true);

-- Administrateur: everything, by construction rather than by listing — a
-- permission added later must not silently skip the role that is meant to hold
-- them all.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.key = 'admin';

-- Gestionnaire: the catalogue and the games, but neither the roles nor the
-- deletions that destroy history.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.key = 'gestionnaire'
  and p.key in (
    'boardgames.create', 'boardgames.read', 'boardgames.update',
    'faq.create', 'faq.read', 'faq.update', 'faq.delete',
    'extensions.create', 'extensions.read', 'extensions.update', 'extensions.delete',
    'players.create', 'players.read', 'players.update',
    'games.create', 'games.read', 'games.update',
    'stats.read',
    'feedback.create', 'feedback.read'
  );

-- Joueur: play, look, and say what he thinks. Reads the catalogue because the
-- new-game funnel and the in-game FAQ need it; changes none of it.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
cross join public.permissions p
where r.key = 'joueur'
  and p.key in (
    'boardgames.read',
    'faq.read',
    'extensions.read',
    'players.read',
    'games.create', 'games.read', 'games.update',
    'stats.read',
    'feedback.create'
  );

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
create policy user_roles_insert on public.user_roles
  for insert to authenticated with check ((select public.has_permission('roles.update')));
create policy user_roles_delete on public.user_roles
  for delete to authenticated using ((select public.has_permission('roles.update')));

grant select, insert, update, delete
  on public.permissions, public.roles, public.role_permissions, public.user_roles
  to authenticated;
grant usage on schema public to anon, authenticated;
