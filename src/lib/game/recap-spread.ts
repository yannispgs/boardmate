/**
 * Where one party sits among the parties before it: the geometry the recap's
 * bars are drawn from, and the percentile the figure falls in.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { ScoreDirection } from "./scoring";

export interface Spread {
  /** The smallest figure the bar spans — its left end. */
  min: number;
  /** The largest — its right end. */
  max: number;
  /** Each past party at its place along the bar, 0 = left, 1 = right. */
  marks: number[];
  /** This party, on the same scale: where the cursor goes. */
  cursor: number;
}

/**
 * The bar behind one measure, or `null` when there is nothing to draw — a first
 * party has a figure and no spread.
 *
 * Parties that all landed on the same figure have no width either. Rather than
 * divide by nothing, everything stacks in the middle: one mark with the cursor
 * on it, which is exactly what happened.
 */
export function spread(past: readonly number[], value: number): Spread | null {
  if (past.length === 0) {
    return null;
  }

  const all = [...past, value];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const width = max - min;

  const at = (v: number) => {
    return width === 0 ? 0.5 : (v - min) / width;
  };

  return { min, max, marks: past.map(at), cursor: at(value) };
}

/**
 * The « top X % » of his own parties this one falls in: rank 3 out of 4 is the
 * top 75 %, rank 1 out of 4 the top 25 %. Smaller is better.
 *
 * Read off the **rank**, never off the figures: a measure whose small end is
 * the good one (Odin's points, the laps of a Catan race) then needs no special
 * case, because the rank already knows which way is up.
 */
export function topPercent(rank: number, total: number): number {
  return Math.round((rank / total) * 100);
}

/**
 * Above this many parties of his own, a rank stops meaning anything: « 37ᵉ sur
 * 62 » is a number the reader has to divide himself. At or below it the rank is
 * the better sentence — it is exact, and a percentage over ten parties can only
 * land on ten values anyway.
 */
const RANK_UP_TO = 10;

/** Where one party sits among a player's own — the two ends get their own word. */
export type Standing =
  | { kind: "best" }
  | { kind: "worst" }
  | { kind: "rank"; rank: number; total: number }
  | { kind: "percent"; percent: number };

/**
 * How this party should be said, given where it ranks among the player's own.
 *
 * The two ends come first and are read off the **figures**, not off the rank:
 * ranks are shared by ties, so the worst of three parties two of which tie for
 * last carries rank 2, not rank 3. Comparing the figure to the end of the scale
 * catches those ex-æquo, which is the point — a party nothing beat is his best
 * whether or not it was beaten to it.
 *
 * A run where every figure is identical is neither: it is the same party played
 * over, and calling it his best would be flattery.
 */
export function standing(
  rank: number,
  value: number,
  past: readonly number[],
  direction: ScoreDirection,
): Standing {
  const low = Math.min(value, ...past);
  const high = Math.max(value, ...past);
  const best = direction === "highest" ? high : low;
  const worst = direction === "highest" ? low : high;

  if (low !== high) {
    if (value === best) {
      return { kind: "best" };
    }

    if (value === worst) {
      return { kind: "worst" };
    }
  }

  const total = past.length + 1;

  if (total <= RANK_UP_TO) {
    return { kind: "rank", rank, total };
  }

  return { kind: "percent", percent: topPercent(rank, total) };
}
