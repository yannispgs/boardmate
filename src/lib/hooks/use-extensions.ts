"use client";

import { useEffect, useState } from "react";

import type { BoardgameId, Extension } from "@/lib/domain";
import { getExtensionRepository } from "@/lib/repositories";

/**
 * The active extensions available for a base game (empty when none / while
 * loading). Reloads when the base game changes.
 */
export function useExtensions(baseGameId: BoardgameId | null): Extension[] {
  const [extensions, setExtensions] = useState<Extension[]>([]);

  useEffect(() => {
    if (baseGameId === null) {
      setExtensions([]);

      return;
    }

    let active = true;

    getExtensionRepository()
      .listByBase(baseGameId)
      .then(list => {
        if (active) {
          setExtensions(list);
        }
      })
      .catch(() => {
        if (active) {
          setExtensions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [baseGameId]);

  return extensions;
}
