/**
 * Where one evening sits among the evenings before it: the geometry the recap's
 * bars are drawn from, and the quarter the figure falls in.
 *
 * Pure: no vendor types, unit-tested.
 */

export interface Spread {
  /** The smallest figure the bar spans — its left end. */
  min: number;
  /** The largest — its right end. */
  max: number;
  /** Each past evening at its place along the bar, 0 = left, 1 = right. */
  marks: number[];
  /** Tonight, on the same scale: where the cursor goes. */
  cursor: number;
}

/**
 * The bar behind one measure, or `null` when there is nothing to draw — a first
 * evening has a figure and no spread.
 *
 * Evenings that all landed on the same figure have no width either. Rather than
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
 * Which quarter of his own evenings tonight falls in, 1 being the best.
 *
 * Read off the **rank**, never off the figures: a measure whose small end is
 * the good one (Odin's points, the laps of a Catan race) then needs no special
 * case, because the rank already knows which way is up.
 *
 * The rank is placed at the middle of its share of the scale rather than at its
 * top — otherwise the best of two evenings lands in the second quarter, which
 * reads as a reproach for a figure nothing was worse than.
 */
export function quarterOf(rank: number, total: number): number {
  const quarter = Math.ceil(((rank - 0.5) / total) * 4);

  return Math.min(4, Math.max(1, quarter));
}
