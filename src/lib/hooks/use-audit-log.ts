"use client";

import { useCallback, useEffect, useState } from "react";

import type { AuditEntry } from "@/lib/domain";
import { getAuditRepository } from "@/lib/repositories";

interface UseAuditLog {
  entries: AuditEntry[];
  loading: boolean;
  /** A page is on its way; the list already shows what came before it. */
  loadingMore: boolean;
  error: string | null;
  /** There may be older entries behind the ones already read. */
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/** How many entries one page holds; the repository defaults to the same. */
const PAGE_SIZE = 100;

/**
 * The modification history, read a page at a time.
 *
 * Paged rather than pulled whole because this table only ever grows — it is the
 * one table in the app with no ceiling. The cursor is the last id read, not an
 * offset: the history is append-only, so nothing can slip between two pages.
 */
export function useAuditLog(): UseAuditLog {
  const repo = getAuditRepository();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const read = useCallback(
    async (before?: number) => {
      const page = await repo.list({ limit: PAGE_SIZE, before });

      setHasMore(page.length === PAGE_SIZE);

      return page;
    },
    [repo],
  );

  useEffect(() => {
    let cancelled = false;

    read()
      .then(page => {
        if (!cancelled) {
          setEntries(page);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Lecture de l'historique impossible. Réessaie.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [read]);

  const loadMore = useCallback(async () => {
    const oldest = entries.at(-1);

    if (oldest === undefined) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const page = await read(oldest.id);

      setEntries(current => [...current, ...page]);
    } catch {
      setError("Lecture de l'historique impossible. Réessaie.");
    } finally {
      setLoadingMore(false);
    }
  }, [entries, read]);

  return { entries, loading, loadingMore, error, hasMore, loadMore };
}
