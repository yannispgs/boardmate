"use client";

import { useCallback, useEffect, useState } from "react";

import type { Account, Permission, Role, RoleId, UserId } from "@/lib/domain";
import { getAccessRepository } from "@/lib/repositories";

interface UseAccess {
  permissions: Permission[];
  roles: Role[];
  /** The accounts a role may be handed to; empty without `roles.read`. */
  accounts: Account[];
  /** The permissions of the signed-in account. */
  mine: string[];
  loading: boolean;
  error: string | null;
  createRole: (
    label: string,
    description: string | null,
    permissionKeys: string[],
  ) => Promise<void>;
  saveRole: (
    role: Role,
    label: string,
    description: string | null,
    permissionKeys: string[],
  ) => Promise<void>;
  removeRole: (role: Role) => Promise<void>;
  assignRole: (userId: UserId, roleId: RoleId) => Promise<void>;
  unassignRole: (userId: UserId, roleId: RoleId) => Promise<void>;
}

/**
 * Loads the whole access model in one go: the catalogue, the roles, the
 * accounts that wear them, and what the signed-in account itself holds. The
 * screen needs all of it to say anything useful — a grid with no roles and a
 * grid the reader may not see are different situations, and only `mine` tells
 * them apart.
 */
export function useAccess(): UseAccess {
  const repo = getAccessRepository();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mine, setMine] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [catalogue, list, people, own] = await Promise.all([
        repo.listPermissions(),
        repo.listRoles(),
        repo.listAccounts(),
        repo.myPermissions(),
      ]);

      setPermissions(catalogue);
      setRoles(list);
      setAccounts(people);
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
    async (
      label: string,
      description: string | null,
      permissionKeys: string[],
    ) => {
      await repo.createRole(label, description, permissionKeys);
      await refresh();
    },
    [repo, refresh],
  );

  const saveRole = useCallback(
    async (
      role: Role,
      label: string,
      description: string | null,
      permissionKeys: string[],
    ) => {
      if (label !== role.label || description !== role.description) {
        await repo.updateRoleIdentity(role.id, label, description);
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

  const assignRole = useCallback(
    async (userId: UserId, roleId: RoleId) => {
      await repo.assignRole(userId, roleId);
      await refresh();
    },
    [repo, refresh],
  );

  const unassignRole = useCallback(
    async (userId: UserId, roleId: RoleId) => {
      await repo.unassignRole(userId, roleId);
      await refresh();
    },
    [repo, refresh],
  );

  return {
    permissions,
    roles,
    accounts,
    mine,
    loading,
    error,
    createRole,
    saveRole,
    removeRole,
    assignRole,
    unassignRole,
  };
}
