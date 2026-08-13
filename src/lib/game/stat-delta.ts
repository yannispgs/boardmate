/**
 * A figure read against a reference — what a stat tile shows underneath its
 * number so it says something rather than merely being true.
 *
 * Deliberately free of any judgement: a party longer than usual is neither good
 * nor bad, so the direction says *above* or *below* and the caller decides what,
 * if anything, that is worth.
 */

/** Where a value sits relative to its reference. */
export type DeltaDirection = "above" | "below" | "level";

export interface StatDelta {
  direction: DeltaDirection;
  /** The signed gap, rounded for display (« +1.6 », « −2.1 », « = »). */
  text: string;
}

/** The proper minus sign — a hyphen reads as a dash next to a digit. */
const MINUS = "−";

/**
 * `value` against `average`, or `null` when there is no reference to read it
 * against. The gap is rounded *before* it is compared to zero, so a party that
 * differs by a hundredth reads « = » rather than a sign pointing at nothing.
 */
export function statDelta(
  value: number,
  average: number | null,
  digits = 1,
): StatDelta | null {
  if (average === null) {
    return null;
  }

  const gap = Number((value - average).toFixed(digits));

  if (gap === 0) {
    return { direction: "level", text: "=" };
  }

  const size = Math.abs(gap).toFixed(digits);

  return gap > 0
    ? { direction: "above", text: `+${size}` }
    : { direction: "below", text: `${MINUS}${size}` };
}
