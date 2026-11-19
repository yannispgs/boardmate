"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameId } from "@/lib/domain";
import { scoringTakeOverAt } from "@/lib/game/scoring-lock";
import { getGameRepository } from "@/lib/repositories";
import type { ScoringLock } from "@/lib/repositories/types";

export interface ScoringLockState {
  /** Who holds the score form: nobody, this phone, or another one. */
  holder: ScoringLock["holder"];
  /** Another phone holds the form, and has for long enough to be relieved. */
  canTakeOver: boolean;
  /** Asks for the form; resolves to whether this phone now holds it. */
  claim: (options?: { takeOver?: boolean }) => Promise<boolean>;
  /** Gives the form back, if this phone holds it. */
  release: () => Promise<void>;
}

const NOBODY: ScoringLock = { holder: null, lockedAt: null };

/**
 * Who is counting the points of a party, followed live across the phones at
 * the table: a form opened on one phone greys the button out on the others as
 * it happens, not on their next reload.
 *
 * The phone holding the form gives it back however it leaves: unmounting the
 * screen (another page of the app) or the page going away altogether.
 */
export function useScoringLock(gameId: GameId): ScoringLockState {
  const repo = getGameRepository();
  const [lock, setLock] = useState<ScoringLock>(NOBODY);
  const [now, setNow] = useState(() => Date.now());
  // Read by the leave handlers, which must not re-subscribe on every change.
  const held = useRef(false);

  held.current = lock.holder === "me";

  useEffect(() => repo.watchScoringLock(gameId, setLock), [repo, gameId]);

  useEffect(() => {
    const leave = () => {
      if (held.current) {
        repo.releaseScoringOnExit(gameId);
      }
    };

    window.addEventListener("pagehide", leave);

    return () => {
      window.removeEventListener("pagehide", leave);

      if (held.current) {
        void repo.releaseScoring(gameId);
      }
    };
  }, [repo, gameId]);

  // The take-over is offered at a moment nothing else re-renders the screen
  // for: the clock is woken up then, once.
  const takeOverAt =
    lock.holder === "other" && lock.lockedAt !== null
      ? scoringTakeOverAt(lock.lockedAt).getTime()
      : null;

  useEffect(() => {
    if (takeOverAt === null || takeOverAt <= now) {
      return;
    }

    const timer = window.setTimeout(() => setNow(Date.now()), takeOverAt - now);

    return () => window.clearTimeout(timer);
  }, [takeOverAt, now]);

  const claim = useCallback(
    async (options?: { takeOver?: boolean }) => {
      const claimed = await repo.claimScoring(gameId, options);

      setLock(claimed);

      return claimed.holder === "me";
    },
    [repo, gameId],
  );

  const release = useCallback(async () => {
    if (!held.current) {
      return;
    }

    await repo.releaseScoring(gameId);
    setLock(NOBODY);
  }, [repo, gameId]);

  return {
    holder: lock.holder,
    canTakeOver: takeOverAt !== null && takeOverAt <= now,
    claim,
    release,
  };
}
