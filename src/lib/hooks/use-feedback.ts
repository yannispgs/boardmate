"use client";

import { useCallback, useEffect, useState } from "react";

import type { Feedback, NewFeedback } from "@/lib/domain";
import { getFeedbackRepository } from "@/lib/repositories";

interface UseFeedback {
  items: Feedback[];
  loading: boolean;
  error: string | null;
  submit: (input: NewFeedback) => Promise<void>;
}

/** Loads the feedback box (newest first) and appends locally on submit. */
export function useFeedback(): UseFeedback {
  const repo = getFeedbackRepository();
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await repo.list());
      setError(null);
    } catch {
      setError("Impossible de charger les retours.");
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = useCallback(
    async (input: NewFeedback) => {
      const created = await repo.create(input);
      setItems(prev => [created, ...prev]);
    },
    [repo],
  );

  return { items, loading, error, submit };
}
