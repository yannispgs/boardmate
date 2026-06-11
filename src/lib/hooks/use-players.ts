"use client";

import { useCallback, useEffect, useState } from "react";

import type { NewPlayer, Player, PlayerId } from "@/lib/domain";
import { getPlayerRepository } from "@/lib/repositories";

interface UsePlayers {
  players: Player[];
  loading: boolean;
  error: string | null;
  addPlayer: (input: NewPlayer) => Promise<void>;
  setActive: (id: PlayerId, isActive: boolean) => Promise<void>;
  rename: (id: PlayerId, name: string) => Promise<void>;
}

/**
 * Loads players and keeps them in sync. Refetches after local mutations and on
 * any remote change (Realtime), so lists stay current across devices.
 */
export function usePlayers(): UsePlayers {
  const repo = getPlayerRepository();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPlayers(await repo.list());
      setError(null);
    } catch {
      setError("Impossible de charger les joueurs.");
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void refresh();
    const unsubscribe = repo.subscribe(() => {
      void refresh();
    });
    return unsubscribe;
  }, [repo, refresh]);

  const addPlayer = useCallback(
    async (input: NewPlayer) => {
      await repo.create(input);
      await refresh();
    },
    [repo, refresh],
  );

  const setActive = useCallback(
    async (id: PlayerId, isActive: boolean) => {
      await repo.setActive(id, isActive);
      await refresh();
    },
    [repo, refresh],
  );

  const rename = useCallback(
    async (id: PlayerId, name: string) => {
      await repo.update(id, { name });
      await refresh();
    },
    [repo, refresh],
  );

  return { players, loading, error, addPlayer, setActive, rename };
}
