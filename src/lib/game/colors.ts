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
  if (durationS <= 0 || remainingS <= 0) {
    return RED;
  }
  const fraction = remainingS / durationS;
  if (fraction > 0.5) {
    return GREEN;
  }
  if (fraction > 0.25) {
    return YELLOW;
  }
  return ORANGE;
}

// Time-share bar palette (matches the Tailwind classes it replaces).
const SHARE_INDIGO: [number, number, number] = [99, 102, 241]; // indigo-500
const SHARE_AMBER: [number, number, number] = [251, 191, 36]; // amber-400
const SHARE_RED: [number, number, number] = [239, 68, 68]; // red-500

/**
 * How "over their fair share" a player is, 0 → 1. 0 at or below an even split of
 * the table's active time; 1 once they reach the monopoly threshold (1.6× the
 * fair share — the same line that trips the "monopolise le temps" banner).
 */
export function timeShareRedness(
  sharePct: number,
  playerCount: number,
): number {
  if (playerCount < 1) {
    return 0;
  }

  const fair = 100 / playerCount;
  const threshold = fair * 1.6;

  return Math.max(0, Math.min(1, (sharePct - fair) / (threshold - fair)));
}

/**
 * The time-distribution bar colour: the base (amber for the winner, else indigo)
 * blended toward red as the player monopolises the table's time — fully red once
 * they hit the monopoly threshold.
 */
export function timeShareColor(
  sharePct: number,
  playerCount: number,
  isWinner: boolean,
): string {
  const base = isWinner ? SHARE_AMBER : SHARE_INDIGO;
  const t = timeShareRedness(sharePct, playerCount);
  const [r, g, b] = base.map((c, i) => Math.round(c + (SHARE_RED[i] - c) * t));

  return `rgb(${r}, ${g}, ${b})`;
}
