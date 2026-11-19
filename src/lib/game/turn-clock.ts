/** The steps the ＋ and － corrections offer, in seconds. */
export const CLOCK_STEPS_S = [10, 30, 60] as const;

/**
 * What a clock reads for a given time played. A countdown reads what is *left*
 * of what was allotted; a table stopwatch — `durationS === null`, nothing
 * allotted — reads the time played itself.
 */
export function clockReading(
  durationS: number | null,
  elapsedS: number,
): number {
  return durationS === null ? elapsedS : durationS - elapsedS;
}

/**
 * The reverse: the active seconds a clock must be credited with for it to read
 * `reading`. Reading and time played are two views of the same quantity, which
 * is why one function turns each into the other.
 *
 * Floored at zero: no clock can have run for less than no time, so asking a
 * countdown for more time left than the turn is long simply puts it back to
 * full, and winding a stopwatch below zero puts it back to nought.
 */
export function elapsedForReading(
  durationS: number | null,
  reading: number,
): number {
  return Math.max(0, Math.round(clockReading(durationS, reading)));
}

/**
 * Whether stepping the clock's reading by `deltaS` keeps it to what the clock
 * can read. A countdown may always be wound down — past nought and deeper into
 * overtime, a turn that ran longer than the clock saw — but never above the
 * turn's own length. A stopwatch winds on without limit, and back to nought at
 * most.
 */
export function canStep(
  durationS: number | null,
  readingS: number,
  deltaS: number,
): boolean {
  const next = readingS + deltaS;

  if (durationS === null) {
    return next >= 0;
  }

  return deltaS < 0 || next <= durationS;
}
