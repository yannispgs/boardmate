import type { RoleId } from "./ids";

/**
 * The four things one can do to a resource. They are deliberately the four SQL
 * commands, so a permission key drops straight into the matching RLS policy
 * with no translation step.
 */
export type PermissionAction = "create" | "read" | "update" | "delete";

/**
 * One tickable box of the grid. The catalogue is authored in migrations, never
 * from the app: a key only exists once the policy that honours it exists too.
 */
export interface Permission {
  /** `<section>.<action>`, e.g. `boardgames.update`. */
  key: string;
  /** The heading it appears under, in French — the owner's wording. */
  section: string;
  action: PermissionAction;
  label: string;
  /**
   * The feature behind it costs money per use. Such a permission may only be
   * attached to an administrator role, and the database refuses otherwise.
   */
  billable: boolean;
  sortOrder: number;
}

/** A named bundle of permissions, composed by the owner in the admin screen. */
export interface Role {
  id: RoleId;
  key: string;
  label: string;
  /**
   * What the role is for, in one sentence, shown under its name. `null` for the
   * roles composed before there was anywhere to write it.
   */
  description: string | null;
  /**
   * Holds every permission, present and future, without listing any of them.
   * Neither the flag nor an assignment of such a role can be undone from the
   * app — that goes through the database.
   */
  isAdmin: boolean;
  /** Shipped by a migration; the app may rename it, never delete it. */
  isSystem: boolean;
  /** Permission keys granted, empty for an admin role (it grants all of them). */
  permissionKeys: string[];
  /**
   * How many accounts wear it. Read to say why a deletion is refused before it
   * is attempted — the database refuses it too, but « 3 comptes » is an answer
   * and a failed click is not.
   */
  assignedCount: number;
}

/** A section of the grid, with its permissions in the owner's order. */
export interface PermissionSection {
  name: string;
  permissions: Permission[];
}

/**
 * Group a flat catalogue into the sections the grid renders, preserving the
 * `sortOrder` the migration gave them — sections come out in the order of their
 * first permission, so the SQL file stays the single place the order is decided.
 */
export function groupBySection(permissions: Permission[]): PermissionSection[] {
  const sections: PermissionSection[] = [];

  for (const permission of [...permissions].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )) {
    const current = sections.at(-1);

    if (current?.name === permission.section) {
      current.permissions.push(permission);
    } else {
      sections.push({ name: permission.section, permissions: [permission] });
    }
  }

  return sections;
}

/**
 * Does this role grant that permission? An admin role answers yes to
 * everything, exactly as `has_permission` does in the database — the screen must
 * not claim a narrower truth than the one being enforced.
 */
export function roleGrants(role: Role, permissionKey: string): boolean {
  return role.isAdmin || role.permissionKeys.includes(permissionKey);
}

/**
 * The key a new role is filed under, derived from the name it was given:
 * lowercase, accents dropped, anything else turned into a single dash.
 *
 * Derived rather than typed, because nothing reads it — it is the stable handle
 * a migration would name the role by, and asking for it would only be one more
 * field to get wrong. It is set once, at creation: renaming a role leaves the
 * key alone, so whatever already refers to it still finds it.
 */
export function roleKeyFrom(label: string): string {
  return (
    label
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      // A single dash at each end at most: the line above has already collapsed
      // every run into one. `-+` here would backtrack for nothing.
      .replace(/^-|-$/g, "")
  );
}

/**
 * Why this role cannot be deleted, in the words the screen shows, or `null`
 * when it can. Both refusals are the database's — `roles_system_kept` and
 * `roles_unassigned_on_delete` raise on exactly these two cases — so the button
 * carries the reason instead of letting the tap come back with an error.
 *
 * Editing is deliberately not covered: an assigned role stays fully editable,
 * which is the whole point of having roles.
 */
export function roleDeleteBlocker(role: Role): string | null {
  if (role.isSystem) {
    return "Rôle fourni par l'application : il ne se supprime pas.";
  }

  if (role.assignedCount > 0) {
    return `Attribué à ${role.assignedCount} compte${role.assignedCount > 1 ? "s" : ""} : retire-le avant de le supprimer.`;
  }

  return null;
}

/**
 * How long a role's sentence may be. Restated by a check constraint in the
 * database, which is where it is actually enforced — this one only stops the
 * typing.
 */
export const MAX_ROLE_DESCRIPTION = 150;

/** What a round of ticking and unticking actually changes. */
export interface PermissionDiff {
  added: string[];
  removed: string[];
}

/**
 * What separates the role as it stands from the role as it is about to be
 * saved. Shown before writing anything: a grid of thirty-five boxes says what
 * is ticked, never what *changed*, and handing somebody rights is the kind of
 * thing one should read back in words before confirming.
 *
 * Both sides come out in catalogue order, so the recap reads down the same
 * order as the grid it was ticked in.
 */
export function permissionDiff(
  before: readonly string[],
  after: readonly string[],
  catalogue: readonly Permission[],
): PermissionDiff {
  const ordered = [...catalogue]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(permission => permission.key);

  return {
    added: ordered.filter(key => after.includes(key) && !before.includes(key)),
    removed: ordered.filter(
      key => before.includes(key) && !after.includes(key),
    ),
  };
}
