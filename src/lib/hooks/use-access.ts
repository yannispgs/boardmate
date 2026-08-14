"use client";

import { useCallback, useEffect, useState } from "react";

import type { Permission, Role } from "@/lib/domain";
import { getAccessRepository } from "@/lib/repositories";

interface UseAccess {
  permissions: Permission[];
  roles: Role[];
  /** The permissions of the signed-in account. */
  mine: string[];
  loading: boolean;
  error: string | null;
  createRole: (label: string, permissionKeys: string[]) => Promise<void>;
  saveRole: (
    role: Role,
    label: string,
    permissionKeys: string[],
  ) => Promise<void>;
  removeRole: (role: Role) => Promise<void>;
}

/**
 * Loads the whole access model in one go: the catalogue, the roles, and what
 * the signed-in account itself holds. The screen needs all three to say
 * anything useful — a grid with no roles and a grid the reader may not see are
 * different situations, and only `mine` tells them apart.
 */
export function useAccess(): UseAccess {
  const repo = getAccessRepository();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [mine, setMine] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [catalogue, list, own] = await Promise.all([
        repo.listPermissions(),
        repo.listRoles(),
        repo.myPermissions(),
      ]);

      setPermissions(catalogue);
      setRoles(list);
      setMine(own);
      setError(null);
    } catch {
      setError("Impossible de charger les rôles et permissions.");
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Every mutation reloads the whole model instead of patching the list. Three
  // small selects buy the truth: the roles come back in the database's order,
  // the assignment counts are the ones the delete guard will read, and a
  // permission the database refused is simply not there.

  const createRole = useCallback(
    async (label: string, permissionKeys: string[]) => {
      await repo.createRole(label, permissionKeys);
      await refresh();
    },
    [repo, refresh],
  );

  const saveRole = useCallback(
    async (role: Role, label: string, permissionKeys: string[]) => {
      if (label !== role.label) {
        await repo.renameRole(role.id, label);
      }

      // An administrator role grants everything by being one; it has no links to
      // rewrite, and writing an empty list would read as taking rights away.
      if (!role.isAdmin) {
        await repo.setRolePermissions(role.id, permissionKeys);
      }

      await refresh();
    },
    [repo, refresh],
  );

  const removeRole = useCallback(
    async (role: Role) => {
      await repo.deleteRole(role.id);
      await refresh();
    },
    [repo, refresh],
  );

  return {
    permissions,
    roles,
    mine,
    loading,
    error,
    createRole,
    saveRole,
    removeRole,
  };
}
