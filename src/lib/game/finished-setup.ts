/**
 * What a game recorded after the fact is laid out on: the sheet it is scored
 * on, the goal tiles it could have been played with, and the calendar its
 * manches follow — all of it read through the extensions the table says it
 * played with, exactly as the launch funnel reads them.
 *
 * It lives here rather than in the form because it is the whole of what the
 * chosen game and extensions imply, and nothing about the form's state.
 *
 * Pure: no vendor types, unit-tested.
 */

import type {
  Boardgame,
  Extension,
  RoundGoal,
  ScoringSpec,
} from "@/lib/domain";

import { composeGoals, composeScoring } from "./extensions";

/** Everything the chosen game and extensions settle before anything is typed. */
export interface FinishedSetup {
  /** The final sheet, extensions' own lines included — null when unscored. */
  scoring: ScoringSpec | null;
  /** Every goal tile that could have been laid, the extensions' included. */
  catalogue: RoundGoal[];
  /** The base length of each stage — empty for a game with no calendar. */
  schedule: number[];
  /** What this game calls a stage at the table — « Manche », « Génération ». */
  stageLabel: string;
}

/** The default name of a stage, for a game that doesn't name its own. */
export const DEFAULT_STAGE_LABEL = "Manche";

export function finishedSetup(
  boardgame: Boardgame | null,
  active: Extension[],
): FinishedSetup {
  const stages = boardgame?.stages;

  return {
    scoring: composeScoring(boardgame?.scoring ?? null, active),
    catalogue: composeGoals(boardgame?.roundGoals ?? [], active),
    // Only a scheduled game has a calendar; a game advancing on a pass has no
    // foreseeable one, so there is nothing to ask the table about.
    schedule: stages?.advance === "schedule" ? (stages.schedule ?? []) : [],
    stageLabel: stages?.label ?? DEFAULT_STAGE_LABEL,
  };
}
