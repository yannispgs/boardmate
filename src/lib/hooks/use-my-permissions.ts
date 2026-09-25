"use client";

import { useEffect, useState } from "react";

import { getAccessRepository } from "@/lib/repositories";

interface UseMyPermissions {
  /** Whether the signed-in account holds the permission behind a control. */
  can: (key: string) => boolean;
  /** True until the answer is known; `can` says no in the meantime. */
  loading: boolean;
}

/**
 * What the signed-in account is allowed to do, so a screen can stop offering
 * what the database is about to refuse.
 *
 * This is **courtesy, not the gate**. The RLS policies decide, and they run
 * whether or not this list was consulted — hiding a button changes nothing
 * about what a crafted request can reach. It exists because a control that
 * always fails is worse than no control: it reads as a broken application
 * rather than as a right somebody else holds.
 *
 * Until the answer arrives `can` says no, so a destructive button is never
 * drawn and then withdrawn from under a finger already moving towards it. A
 * simulated role narrows this list like any other, since it is `my_permissions`
 * that answers — the screens follow along without knowing simulation exists.
 */
export function useMyPermissions(): UseMyPermissions {
  const repo = getAccessRepository();
  const [mine, setMine] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    repo
      .myPermissions()
      .then(keys => {
        if (!cancelled) {
          setMine(keys);
        }
      })
      .catch(() => {
        // An account that cannot read its own permissions holds none it could
        // have been offered here anyway.
        if (!cancelled) {
          setMine([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo]);

  return {
    can: key => mine?.includes(key) ?? false,
    loading: mine === null,
  };
}
