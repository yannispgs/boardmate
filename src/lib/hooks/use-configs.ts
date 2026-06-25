"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  BoardgameId,
  Config,
  ConfigId,
  ConfigTemplate,
  ConfigValues,
} from "@/lib/domain";
import { getConfigRepository } from "@/lib/repositories";

interface UseConfigs {
  template: ConfigTemplate | null;
  configs: Config[];
  loading: boolean;
  error: string | null;
  saveConfig: (
    name: string,
    values: ConfigValues,
    id?: ConfigId,
  ) => Promise<void>;
  removeConfig: (id: ConfigId) => Promise<void>;
}

/**
 * Loads the config template for a boardgame plus its config instances, and
 * keeps the instances in sync (refetch after local mutation and on Realtime).
 * The template is fixed (authored as data) so it is fetched once.
 */
export function useConfigs(boardgameId: BoardgameId): UseConfigs {
  const repo = getConfigRepository();
  const [template, setTemplate] = useState<ConfigTemplate | null>(null);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setConfigs(await repo.list(boardgameId));
      setError(null);
    } catch {
      setError("Impossible de charger les configurations.");
    } finally {
      setLoading(false);
    }
  }, [repo, boardgameId]);

  useEffect(() => {
    let active = true;
    repo
      .getTemplate(boardgameId)
      .then(t => {
        if (active) {
          setTemplate(t);
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger le modèle.");
        }
      });
    void refresh();
    const unsubscribe = repo.subscribe(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repo, boardgameId, refresh]);

  const saveConfig = useCallback(
    async (name: string, values: ConfigValues, id?: ConfigId) => {
      if (id) {
        await repo.update(id, { name, values });
      } else {
        await repo.create({ boardgameId, name, values });
      }
      await refresh();
    },
    [repo, boardgameId, refresh],
  );

  const removeConfig = useCallback(
    async (id: ConfigId) => {
      await repo.remove(id);
      await refresh();
    },
    [repo, refresh],
  );

  return { template, configs, loading, error, saveConfig, removeConfig };
}
