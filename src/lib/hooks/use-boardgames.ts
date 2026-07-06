"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  Boardgame,
  BoardgameId,
  BoardgameUpdate,
  NewBoardgame,
} from "@/lib/domain";
import { getBoardgameRepository } from "@/lib/repositories";

interface UseBoardgames {
  boardgames: Boardgame[];
  loading: boolean;
  error: string | null;
  addBoardgame: (input: NewBoardgame) => Promise<void>;
  editBoardgame: (id: BoardgameId, patch: BoardgameUpdate) => Promise<void>;
  setActive: (id: BoardgameId, isActive: boolean) => Promise<void>;
  removeBoardgame: (id: BoardgameId) => Promise<void>;
  uploadLogo: (file: File) => Promise<string>;
}

/**
 * Loads boardgames and keeps them in sync. Refetches after local mutations and
 * on any remote change (Realtime), so lists stay current across devices.
 */
export function useBoardgames(): UseBoardgames {
  const repo = getBoardgameRepository();
  const [boardgames, setBoardgames] = useState<Boardgame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setBoardgames(await repo.list());
      setError(null);
    } catch {
      setError("Impossible de charger les jeux.");
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

  const addBoardgame = useCallback(
    async (input: NewBoardgame) => {
      await repo.create(input);
      await refresh();
    },
    [repo, refresh],
  );

  const editBoardgame = useCallback(
    async (id: BoardgameId, patch: BoardgameUpdate) => {
      await repo.update(id, patch);
      await refresh();
    },
    [repo, refresh],
  );

  const setActive = useCallback(
    async (id: BoardgameId, isActive: boolean) => {
      await repo.setActive(id, isActive);
      await refresh();
    },
    [repo, refresh],
  );

  const removeBoardgame = useCallback(
    async (id: BoardgameId) => {
      await repo.remove(id);
      await refresh();
    },
    [repo, refresh],
  );

  const uploadLogo = useCallback((file: File) => repo.uploadLogo(file), [repo]);

  return {
    boardgames,
    loading,
    error,
    addBoardgame,
    editBoardgame,
    setActive,
    removeBoardgame,
    uploadLogo,
  };
}
