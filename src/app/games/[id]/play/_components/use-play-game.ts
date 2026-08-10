"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameId, PopulatedGame } from "@/lib/domain";
import { getGameRepository } from "@/lib/repositories";

/** The game being played, and the two ways the screen writes to it. */
export interface PlayGame {
  game: PopulatedGame | null;
  loading: boolean;
  error: string | null;
  /** A write is in flight: the controls that could double it are disabled. */
  busy: boolean;
  setError: (message: string | null) => void;
  reload: () => Promise<void>;
  /**
   * Runs one change the table is waiting on: refuses to start a second while
   * one is in flight, holds the screen busy until it lands, and turns any
   * failure into `failure` on screen. Returns whether it went through.
   */
  run: (failure: string, mutate: () => Promise<void>) => Promise<boolean>;
  /**
   * Same, for a change the screen has already applied locally (a score typed
   * in, a die tapped): it persists in the background without freezing anything,
   * and only surfaces the failure. Returns whether it went through.
   */
  report: (failure: string, mutate: () => Promise<void>) => Promise<boolean>;
}

/** Loads the played game and owns everything the whole screen writes through. */
export function usePlayGame(gameId: GameId): PlayGame {
  const repo = getGameRepository();
  const [game, setGame] = useState<PopulatedGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setGame(await repo.getPopulated(gameId));
      setError(null);
    } catch {
      setError("Impossible de charger la partie.");
    } finally {
      setLoading(false);
    }
  }, [repo, gameId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function report(failure: string, mutate: () => Promise<void>) {
    try {
      await mutate();

      return true;
    } catch {
      setError(failure);

      return false;
    }
  }

  async function run(failure: string, mutate: () => Promise<void>) {
    if (busy) {
      return false;
    }

    setBusy(true);

    try {
      return await report(failure, mutate);
    } finally {
      setBusy(false);
    }
  }

  return { game, loading, error, busy, setError, reload, run, report };
}
