import { formatDuration } from "./format-time";

/** The steps the correction panel offers, in seconds, both ways. */
export const CLOCK_STEPS_S = [10, 30, 60] as const;

/** `[+-]` sign, a minutes-or-seconds number, and an optional `:ss` part. */
const CLOCK = /^([+-]?)(\d+)(?::([0-5]\d))?$/;

/**
 * Reads a hand-typed countdown into seconds. Accepts a bare seconds count
 * (`90`), a clock (`1:30`), and either with a sign — a negative one being an
 * overtime, the very case the correction exists for. Returns `null` on anything
 * else, which is how the panel knows not to offer to apply it.
 */
export function parseClock(input: string): number | null {
  const match = CLOCK.exec(input.trim());

  if (!match) {
    return null;
  }

  const [, sign, left, seconds] = match;
  const total =
    seconds === undefined ? Number(left) : Number(left) * 60 + Number(seconds);

  return sign === "-" ? -total : total;
}

/**
 * Writes a countdown back as a clock, keeping the minus sign an overtime needs
 * (`-0:40`), so what the ± buttons compute can be typed over by hand.
 */
export function formatClockInput(remainingS: number): string {
  const rounded = Math.round(remainingS);

  return `${rounded < 0 ? "-" : ""}${formatDuration(Math.abs(rounded))}`;
}

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
