"use client";

import { useEffect, useState } from "react";

import type { BoardgameId } from "@/lib/domain";
import { breakdownUsage } from "@/lib/game/category-stats";
import { getGameRepository } from "@/lib/repositories";

/**
 * How many finished games already hold points under each category key of a
 * boardgame, so the score sheet editor can say what a deletion would bury.
 *
 * Empty while a boardgame is being created (`null`): nothing can have been
 * recorded against a game that does not exist yet, and the editor then needs no
 * round trip at all.
 */
export function useCategoryUsage(
  boardgameId: BoardgameId | null,
): Record<string, number> {
  const repo = getGameRepository();
  const [usage, setUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!boardgameId) {
      setUsage({});

      return;
    }

    let cancelled = false;

    repo
      .listStats()
      .then(records => {
        if (!cancelled) {
          setUsage(breakdownUsage(records, boardgameId));
        }
      })
      // A count we couldn't fetch must not stop the owner from editing his
      // sheet: fall back to no warning rather than to no editor.
      .catch(() => setUsage({}));

    return () => {
      cancelled = true;
    };
  }, [repo, boardgameId]);

  return usage;
}
