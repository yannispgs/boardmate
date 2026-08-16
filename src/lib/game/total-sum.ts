/**
 * The check on a game whose points are a fixed pile shared out between the
 * players (Papayoo: 250, and 250 whatever the number of players).
 *
 * Such a total is the strongest check the app can run on a hand-typed score
 * sheet: it does not merely say a number looks odd, it says the table's figures
 * cannot all be right. And unlike a per-player cap it costs nothing to state —
 * the rulebook already prints it.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { ScoringSpec } from "@/lib/domain";

/** One player's box on the end-of-game form, empty until a number is typed. */
export interface ScoreEntryValue {
  score: number | null;
}

/**
 * Why the final scores can't be recorded yet, or `null` when they can.
 *
 * Says what is on the sheet so far, so the sentence doubles as the running
 * count while the boxes are being filled in. Silent until every box holds a
 * number: a half-filled sheet is not a miscount, it is an unfinished one.
 */
export function totalSumError(
  entries: readonly ScoreEntryValue[],
  scoring: ScoringSpec | null,
): string | null {
  const expected = scoring?.totalSum ?? null;

  if (expected === null || entries.length === 0) {
    return null;
  }

  let total = 0;

  for (const entry of entries) {
    if (entry.score === null) {
      return null;
    }

    total += entry.score;
  }

  if (total !== expected) {
    return `Le total doit faire ${expected} points (actuellement ${total}).`;
  }

  return null;
}
