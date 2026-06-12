/**
 * Countdown ring colour, ported from board-nest's discrete colour stops:
 * green while plenty of time remains, then yellow, orange, and red as the
 * turn runs out (and once it's over).
 */
const GREEN = "#128700";
const YELLOW = "#C6C000";
const ORANGE = "#cf6800";
const RED = "#A30000";

/** Returns the ring colour for `remainingS` out of a `durationS` turn. */
export function countdownColor(remainingS: number, durationS: number): string {
  if (durationS <= 0 || remainingS <= 0) return RED;
  const fraction = remainingS / durationS;
  if (fraction > 0.5) return GREEN;
  if (fraction > 0.25) return YELLOW;
  return ORANGE;
}
