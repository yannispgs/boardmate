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
 * The time index at which a player is said to be monopolising the table — 1.6×
 * his fair share, the same line that trips the « monopolise le temps » banner.
 *
 * Exported because two screens now paint against it: the live bar below, and
 * the shaded band on the end-of-game recap. One threshold, or the app would
 * call the same evening greedy in one place and merely long in the other
 * (owner, 2026-09-06).
 */
export const MONOPOLY_INDEX = 160;

/** Where the fair share sits on the index — the point nothing is red at. */
const FAIR_INDEX = 100;

/**
 * How "over his fair share" a time index is, 0 → 1: 0 at or below 100, 1 from
 * {@link MONOPOLY_INDEX} on.
 */
export function timeIndexRedness(index: number): number {
  const t = (index - FAIR_INDEX) / (MONOPOLY_INDEX - FAIR_INDEX);

  return Math.max(0, Math.min(1, t));
}

/**
 * The same ramp read off a raw percentage of the table's time — what the live
 * screen has, since it never divides by the table size itself.
 *
 * The two are one formula: an even split of an `n`-handed table is `100 / n`
 * percent, so `pct × n` **is** the index, and the fair share and the threshold
 * scale with it. Written once here rather than derived twice.
 */
export function timeShareRedness(
  sharePct: number,
  playerCount: number,
): number {
  if (playerCount < 1) {
    return 0;
  }

  return timeIndexRedness(sharePct * playerCount);
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
