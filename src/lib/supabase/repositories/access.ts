import type { SupabaseClient } from "@supabase/supabase-js";

import type { Permission, PermissionAction, Role, RoleId } from "@/lib/domain";
import type { AccessRepository } from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";

type PermissionRow = Database["public"]["Tables"]["permissions"]["Row"];
type RoleRow = Database["public"]["Tables"]["roles"]["Row"];

function toPermission(row: PermissionRow): Permission {
  return {
    key: row.key,
    section: row.section,
    action: row.action as PermissionAction,
    label: row.label,
    billable: row.billable,
    sortOrder: row.sort_order,
  };
}

function toRole(
  row: RoleRow & { role_permissions: Array<{ permission_key: string }> },
): Role {
  return {
    id: row.id as RoleId,
    key: row.key,
    label: row.label,
    isAdmin: row.is_admin,
    isSystem: row.is_system,
    permissionKeys: row.role_permissions.map(link => link.permission_key),
  };
}

/**
 * Supabase-backed `AccessRepository`. Reads only: composing roles lands with
 * the administration grid. Everything here is gated by RLS, so an account
 * without `roles.read` gets an empty list rather than an error — the screen
 * decides what to say about that, not this file.
 */
export function createAccessRepository(
  supabase: SupabaseClient<Database>,
): AccessRepository {
  return {
    async listPermissions() {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("sort_order");
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture des permissions: ${error.message}`);
      }

      return data.map(toPermission);
    },

    async listRoles() {
      const { data, error } = await supabase
        .from("roles")
        .select("*, role_permissions(permission_key)")
        .order("is_admin", { ascending: false })
        .order("label");
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture des rôles: ${error.message}`);
      }

      return data.map(toRole);
    },

    async myPermissions() {
      const { data, error } = await supabase.rpc("my_permissions");
      /* c8 ignore next 3 -- defensive guard: a healthy call doesn't error */
      if (error) {
        throw new Error(`Lecture de vos permissions: ${error.message}`);
      }

      return data;
    },
  };
}
