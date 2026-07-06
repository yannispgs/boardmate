"use client";

import { useCallback, useEffect, useState } from "react";

import type { Game, GameListItem, NewGame } from "@/lib/domain";
import { getGameRepository } from "@/lib/repositories";

interface UseGames {
  /** Ongoing games (in progress). */
  games: GameListItem[];
  /** Ended games, for the "finished" disclosure. */
  endedGames: GameListItem[];
  loading: boolean;
  error: string | null;
  createGame: (input: NewGame) => Promise<Game>;
}

/**
 * Loads ongoing and ended games and keeps them in sync (refetch on local
 * mutation and on Realtime change).
 */
export function useGames(): UseGames {
  const repo = getGameRepository();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [endedGames, setEndedGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [ongoing, ended] = await Promise.all([
        repo.list({ status: "ongoing" }),
        repo.list({ status: "ended" }),
      ]);
      setGames(ongoing);
      setEndedGames(ended);
      setError(null);
    } catch {
      setError("Impossible de charger les parties.");
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

  const createGame = useCallback(
    async (input: NewGame) => {
      const game = await repo.create(input);
      await refresh();
      return game;
    },
    [repo, refresh],
  );

  return { games, endedGames, loading, error, createGame };
}
