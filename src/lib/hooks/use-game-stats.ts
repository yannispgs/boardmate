"use client";

import { useCallback, useEffect, useState } from "react";

import type { GameStatsRecord } from "@/lib/domain";
import { getGameRepository } from "@/lib/repositories";

interface UseGameStats {
  records: GameStatsRecord[];
  loading: boolean;
  error: string | null;
}

/**
 * Loads every finished game reduced for cross-game aggregation (the global
 * stats page) and keeps it in sync with Realtime game changes.
 */
export function useGameStats(): UseGameStats {
  const repo = getGameRepository();
  const [records, setRecords] = useState<GameStatsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRecords(await repo.listStats());
      setError(null);
    } catch {
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    refresh();
    const unsubscribe = repo.subscribe(() => {
      refresh();
    });

    return unsubscribe;
  }, [repo, refresh]);

  return { records, loading, error };
}
