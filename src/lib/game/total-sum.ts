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

/** What the boxes filled in so far add up to, and how many of them there are. */
function filledIn(entries: readonly ScoreEntryValue[]): {
  total: number;
  count: number;
} {
  let total = 0;
  let count = 0;

  for (const entry of entries) {
    if (entry.score !== null) {
      total += entry.score;
      count += 1;
    }
  }

  return { total, count };
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

  const { total, count } = filledIn(entries);

  // An overshoot is knowable before the sheet is complete, and saying so early
  // is the difference between a correction and a dead end: the last box fills
  // itself, so a table that never types it would otherwise face a refused sheet
  // with nothing to read. Only where a score cannot go below zero — elsewhere a
  // later negative can still bring the total back down.
  if (count < entries.length) {
    if (!scoring?.allowNegative && total > expected) {
      return `Le total dépasse déjà ${expected} points (actuellement ${total}).`;
    }

    return null;
  }

  if (total !== expected) {
    return `Le total doit faire ${expected} points (actuellement ${total}).`;
  }

  return null;
}

/**
 * The number the one box still empty has to hold, or `null` when nothing can be
 * said yet.
 *
 * The last player's score of a shared pile is not a score somebody counts, it
 * is what is left — so the form fills it in rather than asking the table to do
 * the subtraction it already knows the answer to. It stays a proposal: typing
 * over it replaces it.
 *
 * Silent unless exactly one box is empty (two unknowns have no single answer),
 * and silent on a value that would be negative in a game whose scores cannot
 * be — that is a miscount higher up the sheet, and {@link totalSumError} is the
 * one that says so.
 */
export function completingScore(
  entries: readonly ScoreEntryValue[],
  scoring: ScoringSpec | null,
): number | null {
  const expected = scoring?.totalSum ?? null;

  if (expected === null) {
    return null;
  }

  const { total, count } = filledIn(entries);

  if (count !== entries.length - 1) {
    return null;
  }

  const missing = expected - total;

  if (missing < 0 && !scoring?.allowNegative) {
    return null;
  }

  return missing;
}
