/**
 * Where one party sits among the parties before it: the geometry the recap's
 * bars are drawn from, and the percentile the figure falls in.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { ScoreDirection } from "./scoring";

export interface Spread {
  /** The figure the bar starts on, at its left end. */
  left: number;
  /** The figure it ends on — the good end, whenever the measure has one. */
  right: number;
  /** Each past party at its place along the bar, 0 = left, 1 = right. */
  marks: number[];
  /** This party, on the same scale: where the cursor goes. */
  cursor: number;
}

/**
 * The bar behind one measure, or `null` when there is nothing to draw — a first
 * party has a figure and no spread.
 *
 * **The good end is always the right one.** Stacked one under the other, bars
 * that disagreed on which way is up would make a column of cursors where a
 * cursor far right means a fine evening on one line and a poor one on the next
 * — read at a glance, which is the only way a column of bars is read. So a
 * measure whose small figure wins (a placement, the laps of a Catan race,
 * Odin's points) runs its scale backwards, and its two end labels swap with it.
 *
 * A measure with no good end at all (a share of the table's time) keeps the
 * natural order, smallest first: there is nothing to point the other way.
 *
 * Parties that all landed on the same figure have no width. Rather than divide
 * by nothing, everything stacks in the middle: one mark with the cursor on it,
 * which is exactly what happened.
 */
export function spread(
  past: readonly number[],
  value: number,
  direction: ScoreDirection | null,
): Spread | null {
  if (past.length === 0) {
    return null;
  }

  const all = [...past, value];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const width = max - min;
  const descending = direction === "lowest";

  const at = (v: number) => {
    if (width === 0) {
      return 0.5;
    }

    const t = (v - min) / width;

    return descending ? 1 - t : t;
  };

  return {
    left: descending ? max : min,
    right: descending ? min : max,
    marks: past.map(at),
    cursor: at(value),
  };
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

/** The share of his own parties that counts as one end of his range. */
const EDGE_PERCENT = 20;

/** How loudly a standing should be said: worth noticing, or just a figure. */
export type Tone = "good" | "bad" | "neutral";

/**
 * Whether a standing is worth colouring — the top fifth of his own parties, the
 * bottom fifth, or neither.
 *
 * The two ends are always coloured, whatever the arithmetic says: on three
 * parties his best is the top 33 %, and leaving « sa meilleure » grey because
 * three is a small number would be the one reading nobody would accept. Past
 * five parties the ends fall inside the fifth anyway, so the rule and the
 * exception agree and only the short histories need saying.
 */
export function standingTone(where: Standing): Tone {
  if (where.kind === "best") {
    return "good";
  }

  if (where.kind === "worst") {
    return "bad";
  }

  const percent =
    where.kind === "percent"
      ? where.percent
      : topPercent(where.rank, where.total);

  if (percent <= EDGE_PERCENT) {
    return "good";
  }

  return percent > 100 - EDGE_PERCENT ? "bad" : "neutral";
}
