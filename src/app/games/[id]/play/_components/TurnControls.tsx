"use client";

import { useState } from "react";

import type { PlayerId } from "@/lib/domain";

import { NextTurnControl } from "./NextTurnControl";
import { StageGoalPrompt } from "./StageGoalPrompt";

/** What one player took on the manche's goal tile. */
export type GoalPoints = Array<{ playerId: PlayerId; points: number }>;

/**
 * What the table does with the turn it is on: hand it to the next player, step
 * out of the generation — or, on the last turn of a manche, close the manche.
 *
 * Closing one is not just another turn, so it goes through the goal prompt:
 * the tile is scored while the birds are still on the table, and only once
 * those points are down does the table move on. The prompt's open/closed state
 * belongs here, since nothing above has anything to do while it is up.
 *
 * Unless the manche was laid with « Pas d'objectif » (Oceania): it pays nobody,
 * so nothing is asked and the manche closes on zero for everyone.
 */
export function TurnControls({
  atFinalTurn,
  atStageEnd,
  goalScores,
  stage,
  stageLabel,
  goalLabel,
  players,
  entered,
  disabled,
  onNext,
  onPass,
  onScoreGoal,
}: Readonly<{
  atFinalTurn: boolean;
  /** The table has gone round for the last time this manche. */
  atStageEnd: boolean;
  /** Whether this manche's tile is worth anything to anybody. */
  goalScores: boolean;
  stage: number;
  /** What the box calls a stage (« Manche »). */
  stageLabel: string;
  /** The goal tile, read out — « Œufs dans Mer ». */
  goalLabel: string;
  players: Array<{ id: PlayerId; name: string }>;
  /** Points already entered for this stage, by player. */
  entered: Record<string, number>;
  disabled: boolean;
  onNext: () => Promise<void>;
  /** Null for a game with no generations, where nobody can pass. */
  onPass: (() => void) | null;
  onScoreGoal: (points: GoalPoints) => Promise<void>;
}>) {
  const [promptOpen, setPromptOpen] = useState(false);

  /**
   * Ending a manche: ask the table what the tile paid — or, when it pays
   * nobody, write everyone's zero down and move on without a word. A manche
   * with no goal is still a manche, and its zeros are still recorded.
   */
  function endStage() {
    if (goalScores) {
      setPromptOpen(true);

      return;
    }

    void closeStage(players.map(p => ({ playerId: p.id, points: 0 })));
  }

  /**
   * Closes a manche: the goal points are written down first, then the table
   * moves on — unless this was the last manche, where there is nothing to move
   * on to and the end-of-game flow takes over.
   */
  async function closeStage(points: GoalPoints) {
    setPromptOpen(false);
    await onScoreGoal(points);

    if (!atFinalTurn) {
      await onNext();
    }
  }

  return (
    <>
      <NextTurnControl
        atFinalTurn={atFinalTurn}
        disabled={disabled}
        nextLabel={
          atStageEnd ? `Fin de la ${stageLabel.toLowerCase()} →` : undefined
        }
        stageGoalLabel={
          goalScores
            ? undefined
            : `Terminer la ${stageLabel.toLowerCase()} (sans objectif)`
        }
        onNext={atStageEnd ? endStage : () => void onNext()}
        onPass={onPass}
        onStageGoal={atStageEnd ? endStage : null}
      />

      {promptOpen ? (
        <StageGoalPrompt
          stage={stage}
          stageLabel={stageLabel}
          goalLabel={goalLabel}
          players={players}
          initial={entered}
          disabled={disabled}
          confirmLabel={atFinalTurn ? "Enregistrer" : `${stageLabel} suivante`}
          onConfirm={points => void closeStage(points)}
          onCancel={() => setPromptOpen(false)}
        />
      ) : null}
    </>
  );
}
