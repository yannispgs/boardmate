import type { SupabaseClient } from "@supabase/supabase-js";

import type { Permission, PermissionAction, Role, RoleId } from "@/lib/domain";
import { roleKeyFrom } from "@/lib/domain";
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
  row: RoleRow & {
    role_permissions: Array<{ permission_key: string }>;
    user_roles: Array<{ count: number }>;
  },
): Role {
  return {
    id: row.id as RoleId,
    key: row.key,
    label: row.label,
    description: row.description,
    isAdmin: row.is_admin,
    isSystem: row.is_system,
    permissionKeys: row.role_permissions.map(link => link.permission_key),
    /* c8 ignore next -- PostgREST always sends the aggregate, zero included */
    assignedCount: row.user_roles.at(0)?.count ?? 0,
  };
}

/**
 * Supabase-backed `AccessRepository`. Everything here is gated by RLS, so an
 * account without `roles.read` gets an empty list rather than an error — the
 * screen decides what to say about that, not this file.
 *
 * ⚠️ On the writing side that same silence is a trap: a refused UPDATE or
 * DELETE reports success on zero rows. Both therefore ask for the row back and
 * treat « nothing came back » as the refusal it is.
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
        // The assignments are counted, never listed: the screen only needs to
        // know whether anybody would lose rights, and who wears what is the
        // next screen's question.
        .select("*, role_permissions(permission_key), user_roles(count)")
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

    async createRole(label, description, permissionKeys) {
      const { data, error } = await supabase
        .from("roles")
        .insert({ key: roleKeyFrom(label), label, description })
        .select("*")
        .single();

      if (error) {
        throw new Error(`Création du rôle: ${error.message}`);
      }

      await grant(supabase, data.id, permissionKeys);

      return toRole({
        ...data,
        role_permissions: permissionKeys.map(key => ({ permission_key: key })),
        user_roles: [],
      });
    },

    async updateRoleIdentity(roleId, label, description) {
      const { data, error } = await supabase
        .from("roles")
        .update({ label, description })
        .eq("id", roleId)
        .select("id");

      if (error) {
        throw new Error(`Modification du rôle: ${error.message}`);
      }

      if (data.length === 0) {
        throw new Error("Modification du rôle: refusée");
      }
    },

    async setRolePermissions(roleId, permissionKeys) {
      // Take the grants away first: a role passes through *fewer* rights on its
      // way to its new shape, never through more. If the second half fails, what
      // is left standing is the narrower role.
      const revoke = supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId);
      const kept = permissionKeys.map(key => `"${key}"`).join(",");
      // An empty list means « keep none », and `in.()` is not a filter PostgREST
      // will build — so the exception is the unfiltered delete itself.
      const { error: revoked } = await (permissionKeys.length === 0
        ? revoke
        : revoke.not("permission_key", "in", `(${kept})`));

      /* c8 ignore next 3 -- defensive guard: a refused delete touches no row */
      if (revoked) {
        throw new Error(`Retrait de permissions: ${revoked.message}`);
      }

      await grant(supabase, roleId, permissionKeys);
    },

    async deleteRole(roleId) {
      const { data, error } = await supabase
        .from("roles")
        .delete()
        .eq("id", roleId)
        .select("id");

      if (error) {
        throw new Error(`Suppression du rôle: ${error.message}`);
      }

      if (data.length === 0) {
        throw new Error("Suppression du rôle: refusée");
      }
    },
  };
}

/**
 * Attaches permissions to a role, ignoring the ones it already has — the grid
 * hands over the whole ticked list, not the difference, and the primary key is
 * what decides which of them are new.
 */
async function grant(
  supabase: SupabaseClient<Database>,
  roleId: string,
  permissionKeys: string[],
): Promise<void> {
  if (permissionKeys.length === 0) {
    return;
  }

  const { error } = await supabase.from("role_permissions").upsert(
    permissionKeys.map(key => ({ role_id: roleId, permission_key: key })),
    { ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(`Attribution de permissions: ${error.message}`);
  }
}
