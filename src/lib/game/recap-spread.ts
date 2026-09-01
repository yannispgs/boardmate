/**
 * Where one party sits among the parties before it: the geometry the recap's
 * bars are drawn from, and the percentile the figure falls in.
 *
 * Pure: no vendor types, unit-tested.
 */

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
 *
 * The scale is the player's own history, so it is as fine as that history is
 * long — over four parties the only values are 25, 50, 75 and 100. The exact
 * count stays on the player's own line, which is where a reader checks how much
 * a percentage is worth.
 */
export function topPercent(rank: number, total: number): number {
  return Math.round((rank / total) * 100);
}
