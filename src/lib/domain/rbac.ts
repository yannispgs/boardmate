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
   * Holds every permission, present and future, without listing any of them.
   * Neither the flag nor an assignment of such a role can be undone from the
   * app — that goes through the database.
   */
  isAdmin: boolean;
  /** Shipped by a migration; the app may rename it, never delete it. */
  isSystem: boolean;
  /** Permission keys granted, empty for an admin role (it grants all of them). */
  permissionKeys: string[];
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
