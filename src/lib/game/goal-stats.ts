/**
 * What each end-of-manche goal tile is actually worth at this table, over the
 * parties in scope (Wingspan).
 *
 * Two readings, because a tile is really two things. « Œufs dans X » is one
 * item in the box, and knowing the family pays 4 points on average tells you
 * whether to draft eggs at all; but « Œufs dans Mer » is what was on the board
 * that night, and it is the reading that says the sea never pays here. The
 * caller picks which one it wants — see {@link goalStats}.
 *
 * Pure: no vendor types, unit-tested.
 */
import type { GameStatsRecord, RoundGoal, StageGoalRecord } from "@/lib/domain";

import {
  formatGoalLabel,
  goalSignature,
  goalTemplateLabel,
} from "./round-goals";

/** One goal tile's record over the parties in scope. */
export interface GoalStat {
  /** Identifies the row: the tile's key, and its values in the finer reading. */
  id: string;
  /** How the tile reads — hole-punched by family, filled in by value. */
  label: string;
  /** Manches played on it. */
  played: number;
  /** Mean points one player took from it. */
  avgPoints: number;
  /** The most anybody ever took from it. */
  bestPoints: number;
}

/** What is being summed up for one row, before it is averaged out. */
interface Tally {
  label: string;
  played: number;
  points: number;
  entries: number;
  best: number;
}

/**
 * The goal tiles played across `records`, best paying first. `byParams` splits
 * a family into the values it was set up with (« Œufs dans Mer » on its own
 * row) instead of pooling them under the family's title.
 *
 * A tile the catalogue no longer offers is dropped rather than shown under its
 * bare key: it would read as a line of gibberish, and there is nothing to
 * compare it with anyway.
 */
export function goalStats(
  records: GameStatsRecord[],
  catalogue: RoundGoal[],
  byParams: boolean,
): GoalStat[] {
  const tallies = new Map<string, Tally>();

  for (const record of records) {
    for (const goal of record.stageGoals ?? []) {
      const tile = catalogue.find(g => g.key === goal.goalKey);

      if (tile !== undefined) {
        tally(tallies, tile, goal, byParams);
      }
    }
  }

  return [...tallies.entries()]
    .map(([id, row]) => ({
      id,
      label: row.label,
      played: row.played,
      avgPoints: row.entries === 0 ? 0 : row.points / row.entries,
      bestPoints: row.best,
    }))
    .sort(
      (a, b) => b.avgPoints - a.avgPoints || a.label.localeCompare(b.label),
    );
}

/** Folds one played manche into the row it belongs to, creating it if needed. */
function tally(
  tallies: Map<string, Tally>,
  tile: RoundGoal,
  goal: StageGoalRecord,
  byParams: boolean,
): void {
  const id = byParams
    ? goalSignature(goal.goalKey, goal.goalParams)
    : goal.goalKey;
  const row = tallies.get(id) ?? {
    label: byParams
      ? formatGoalLabel(tile, goal.goalParams)
      : goalTemplateLabel(tile),
    played: 0,
    points: 0,
    entries: 0,
    best: 0,
  };

  row.played += 1;

  for (const entry of goal.points) {
    row.points += entry.points;
    row.entries += 1;
    row.best = Math.max(row.best, entry.points);
  }

  tallies.set(id, row);
}
