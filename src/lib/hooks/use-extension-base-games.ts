"use client";

import { useEffect, useState } from "react";

import type { BoardgameId } from "@/lib/domain";
import { getExtensionRepository } from "@/lib/repositories";

/**
 * The ids of the games that have at least one extension, as a set — one query
 * for the whole "Jeux" list instead of one per card. Empty while loading, so
 * the extensions shortcut simply appears once the answer is known.
 */
export function useExtendedBaseGames(): Set<BoardgameId> {
  const [ids, setIds] = useState<Set<BoardgameId>>(new Set());

  useEffect(() => {
    let active = true;

    getExtensionRepository()
      .listExtendedBaseGames()
      .then(list => {
        if (active) {
          setIds(new Set(list));
        }
      })
      .catch(() => {
        if (active) {
          setIds(new Set());
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return ids;
}
