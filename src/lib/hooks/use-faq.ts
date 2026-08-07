"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  FaqEntry,
  FaqEntryId,
  FaqEntryUpdate,
  NewFaqEntry,
} from "@/lib/domain";
import { getFaqRepository } from "@/lib/repositories";

interface UseFaq {
  entries: FaqEntry[];
  loading: boolean;
  error: string | null;
  add: (input: NewFaqEntry) => Promise<void>;
  edit: (id: FaqEntryId, patch: FaqEntryUpdate) => Promise<void>;
  remove: (id: FaqEntryId) => Promise<void>;
  reorder: (
    changes: Array<{ id: FaqEntryId; sortOrder: number }>,
  ) => Promise<void>;
}

/**
 * The whole FAQ, loaded once. Every scope comes down together — it is a
 * handful of questions per game, and having them all in hand is what makes
 * searching across games (and Boardmate itself) a single filter.
 */
export function useFaq(): UseFaq {
  const repo = getFaqRepository();
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setEntries(await repo.list());
      setError(null);
    } catch {
      setError("Impossible de charger la FAQ.");
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (input: NewFaqEntry) => {
      const created = await repo.create(input);
      setEntries(prev => [...prev, created]);
    },
    [repo],
  );

  const edit = useCallback(
    async (id: FaqEntryId, patch: FaqEntryUpdate) => {
      const saved = await repo.update(id, patch);
      setEntries(prev => prev.map(e => (e.id === id ? saved : e)));
    },
    [repo],
  );

  const remove = useCallback(
    async (id: FaqEntryId) => {
      await repo.remove(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    },
    [repo],
  );

  const reorder = useCallback(
    async (changes: Array<{ id: FaqEntryId; sortOrder: number }>) => {
      // Applied locally first: the list must move under the finger, not after
      // the round trip.
      const orders = new Map(changes.map(c => [c.id, c.sortOrder]));
      setEntries(prev =>
        prev.map(e => {
          const sortOrder = orders.get(e.id);

          return sortOrder === undefined ? e : { ...e, sortOrder };
        }),
      );
      await repo.reorder(changes);
    },
    [repo],
  );

  return { entries, loading, error, add, edit, remove, reorder };
}
