"use client";

import { useCallback, useEffect, useState } from "react";

import type { Game, GameStatus, NewGame } from "@/lib/domain";
import { getGameRepository } from "@/lib/repositories";

interface UseGames {
  games: Game[];
  loading: boolean;
  error: string | null;
  createGame: (input: NewGame) => Promise<Game>;
}

/**
 * Loads games for a given status (defaults to ongoing) and keeps them in sync
 * (refetch on local mutation and on Realtime change).
 */
export function useGames(status: GameStatus = "ongoing"): UseGames {
  const repo = getGameRepository();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setGames(await repo.list({ status }));
      setError(null);
    } catch {
      setError("Impossible de charger les parties.");
    } finally {
      setLoading(false);
    }
  }, [repo, status]);

  useEffect(() => {
    void refresh();
    const unsubscribe = repo.subscribe(() => {
      void refresh();
    });
    return unsubscribe;
  }, [repo, refresh]);

  const createGame = useCallback(
    async (input: NewGame) => {
      const game = await repo.create(input);
      await refresh();
      return game;
    },
    [repo, refresh],
  );

  return { games, loading, error, createGame };
}
