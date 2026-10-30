/**
 * Phase 10 across the parties already played: how far the table has usually
 * climbed after each manche, and what each phase costs to clear.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { GameStatsRecord } from "@/lib/domain";

import { ladderClimb } from "./ladder";

/** The table's average climb once a given manche is written down. */
export interface LadderProgressPoint {
  /** The manche, counted from 1. */
  stage: number;
  /** Rungs cleared, averaged over every player of every party that got there. */
  average: number;
  /** How many parties lasted that long — the later manches rest on fewer. */
  games: number;
}

/**
 * The average climb, manche by manche, over the parties given. A party only
 * speaks for the manches it actually played: averaging in the ones that ended
 * early as if they had stood still would drag the late manches down for no
 * reason. The variant is left out — everybody climbs in step there, so it
 * would say nothing about how the table climbs.
 */
export function ladderProgress(
  records: readonly GameStatsRecord[],
  top: number,
): LadderProgressPoint[] {
  const buckets: Array<{ sum: number; count: number; games: number }> = [];

  for (const record of records) {
    if (record.ladderFixed === true) {
      continue;
    }

    const climb = ladderClimb(
      record.players.map(p => p.playerId),
      record.stageScores ?? [],
      top,
      false,
    );

    for (const [index, manche] of climb.entries()) {
      const rungs = Object.values(manche.rungs);
      const bucket = buckets[index] ?? { sum: 0, count: 0, games: 0 };

      bucket.sum += rungs.reduce((sum, rung) => sum + rung, 0);
      bucket.count += rungs.length;
      bucket.games += 1;
      buckets[index] = bucket;
    }
  }

  return buckets.map((bucket, index) => ({
    stage: index + 1,
    average: bucket.sum / bucket.count,
    games: bucket.games,
  }));
}

/** What clearing one rung has cost, on average, over the parties given. */
export interface RungEffort {
  /** The rung, counted from 1 (« Phase 4 »). */
  rung: number;
  /** Manches spent on it before it was cleared, the clearing one included. */
  manches: number;
  /**
   * Laps of the table those manches took, summed — null while no clearing of
   * it was played with the laps counted all the way.
   */
  laps: number | null;
  /** How many times it was cleared — what both averages rest on. */
  cleared: number;
}

/** The laps a manche took, as the table counted them, or null. */
function lapsOf(record: GameStatsRecord, stage: number): number | null {
  return (
    (record.phaseTimes ?? []).find(p => p.stage === stage && p.laps != null)
      ?.laps ?? null
  );
}

/**
 * What each rung costs to clear: every manche a player spent on it, the failed
 * ones as much as the one he cleared it in. A rung he was still on when the
 * party ended was never cleared, and is left out rather than read as cheap.
 * The variant is left out too — there nobody stays on a rung.
 */
export function rungEffort(
  records: readonly GameStatsRecord[],
  top: number,
): RungEffort[] {
  const totals = Array.from({ length: top }, () => ({
    manches: 0,
    laps: 0,
    counted: 0,
    cleared: 0,
  }));

  for (const record of records) {
    if (record.ladderFixed === true) {
      continue;
    }

    const scores = record.stageScores ?? [];
    const stages = [...new Set(scores.map(s => s.stage))].sort((a, b) => a - b);

    for (const { playerId } of record.players) {
      let rung = 0;
      let manches = 0;
      let laps: number | null = 0;

      for (const stage of stages) {
        if (rung >= top) {
          break;
        }

        const line = scores.find(
          s => s.stage === stage && s.playerId === playerId,
        );
        const lapCount = lapsOf(record, stage);

        manches += 1;
        laps = laps === null || lapCount === null ? null : laps + lapCount;

        if (line?.cleared === true) {
          const bucket = totals[rung];

          bucket.manches += manches;
          bucket.cleared += 1;

          if (laps !== null) {
            bucket.laps += laps;
            bucket.counted += 1;
          }

          rung += 1;
          manches = 0;
          laps = 0;
        }
      }
    }
  }

  return totals.flatMap((bucket, index) =>
    bucket.cleared === 0
      ? []
      : [
          {
            rung: index + 1,
            manches: bucket.manches / bucket.cleared,
            laps: bucket.counted === 0 ? null : bucket.laps / bucket.counted,
            cleared: bucket.cleared,
          },
        ],
  );
}
