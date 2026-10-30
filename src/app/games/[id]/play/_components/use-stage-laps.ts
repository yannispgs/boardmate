"use client";

import { useState } from "react";

import type { PopulatedGame } from "@/lib/domain";
import { getGameRepository } from "@/lib/repositories";

export interface StageLaps {
  /** The lap the table is on in the manche being played, from 1. */
  lap: number;
  /** A write is in flight. */
  busy: boolean;
  error: string | null;
  /** Moves the count by one lap, either way — never below the first. */
  step: (delta: 1 | -1) => void;
}

/**
 * The laps of the manche being played, counted by the table (Phase 10): one
 * tap each time the deal comes back round to the dealer. Written down as it
 * goes, so a party left for the evening and picked up later finds the count
 * where it was — and the stats can tell a phase cleared in three laps from one
 * that drags on for nine.
 *
 * `phaseKey` is the manche's one phase; null switches the count off.
 */
export function useStageLaps(
  game: PopulatedGame,
  phaseKey: string | null,
): StageLaps | null {
  const repo = getGameRepository();
  const recorded =
    game.phaseTimes.find(p => p.stage === game.stage && p.phaseKey === phaseKey)
      ?.laps ?? 1;
  // What the table tapped since the game was last read, for this manche only:
  // a new manche starts from what the books say of it — nothing, so lap 1.
  const [tapped, setTapped] = useState<{ stage: number; lap: number } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (phaseKey === null) {
    return null;
  }

  const lap = tapped?.stage === game.stage ? tapped.lap : recorded;

  async function step(delta: 1 | -1) {
    if (phaseKey === null) {
      return;
    }

    const next = Math.max(1, lap + delta);
    const stage = game.stage;

    setTapped({ stage, lap: next });
    setError(null);
    setBusy(true);

    try {
      await repo.setPhaseLaps(game.id, stage, phaseKey, next);
    } catch {
      setTapped({ stage, lap });
      setError("Impossible d'enregistrer le tour.");
    } finally {
      setBusy(false);
    }
  }

  return {
    lap,
    busy,
    error,
    step: delta => void step(delta),
  };
}
