"use client";

import { useState } from "react";

import type { PlayerId, PopulatedGame, StageScore } from "@/lib/domain";
import { getGameRepository } from "@/lib/repositories";

export interface StageGoalLog {
  /** Every stage goal scored so far, owned locally so the entry shows at once. */
  scores: StageScore[];
  /** A stage is being written: no second validation until it has landed. */
  busy: boolean;
  /** Why the last entry didn't take, `null` when everything went through. */
  error: string | null;
  /** What was already entered for one stage, by player — the form's prefill. */
  entered: (stage: number) => Record<string, number>;
  /** Records what each player scored on one stage's goal. */
  save: (
    stage: number,
    points: Array<{ playerId: PlayerId; points: number }>,
  ) => Promise<void>;
}

/**
 * The end-of-manche goals, entered as each manche closes (Wingspan). They are
 * kept here rather than re-read from the game, so correcting a total shows
 * immediately and the final sheet's derived « Objectifs de manche » line follows
 * without a round trip. A refused write puts the old numbers back.
 */
export function useStageGoals(game: PopulatedGame): StageGoalLog {
  const repo = getGameRepository();
  const [scores, setScores] = useState<StageScore[]>(() => game.stageScores);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function entered(stage: number): Record<string, number> {
    return Object.fromEntries(
      scores.filter(s => s.stage === stage).map(s => [s.playerId, s.points]),
    );
  }

  async function save(
    stage: number,
    points: Array<{ playerId: PlayerId; points: number }>,
  ) {
    const before = scores;

    // Re-entering a manche replaces it: the same player never holds two rows.
    setScores([
      ...scores.filter(s => s.stage !== stage),
      ...points.map(entry => ({ ...entry, stage })),
    ]);
    setError(null);
    setBusy(true);

    try {
      await repo.setStageScores(game.id, stage, points);
    } catch {
      setScores(before);
      setError("Impossible d'enregistrer les points de la manche.");
    } finally {
      setBusy(false);
    }
  }

  return { scores, busy, error, entered, save };
}
