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

  return { permissions, roles, mine, loading, error };
}
