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

/** Two colours mixed `t` of the way across, `t` outside 0–1 pinned to its end. */
function blend(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number,
): string {
  const k = Math.max(0, Math.min(1, t));
  const [r, g, b] = from.map((c, i) => Math.round(c + (to[i] - c) * k));

  return `rgb(${r}, ${g}, ${b})`;
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
  return blend(
    isWinner ? SHARE_AMBER : SHARE_INDIGO,
    SHARE_RED,
    timeShareRedness(sharePct, playerCount),
  );
}

/** The index a player is read as having played briskly at — the green end. */
const BRISK_INDEX = 60;

const INDEX_GREEN: [number, number, number] = [34, 197, 94]; // green-500
const INDEX_WHITE: [number, number, number] = [255, 255, 255];

/**
 * The colour the time index is written in: a strong green at
 * {@link BRISK_INDEX}, white at the fair share, and red from
 * {@link MONOPOLY_INDEX} on, ramping linearly between the three (owner,
 * 2026-09-06).
 *
 * Two ramps meeting at white rather than one green-to-red sweep, because the
 * figure has a **meaning** at 100 and not merely a middle: it is the share the
 * table would give everybody. White is what says « nothing to report » on a
 * screen that is always dark — the figure simply reads as the text around it,
 * and only leans on a colour once it has left the fair share in one direction
 * or the other.
 *
 * Red arrives exactly at the line the bar's shaded band reaches full strength
 * on, and that is the point of putting them in one file: the same evening must
 * not be called greedy by the band and merely long by the figure.
 *
 * Both ends are pinned, so 40 is the same green as 60 and 300 the same red as
 * 160. Past those the figure has said all it can say, and stretching the ramp
 * to hold an outlier would repaint every ordinary evening to make room for it.
 */
export function timeIndexColor(index: number): string {
  if (index < FAIR_INDEX) {
    return blend(
      INDEX_GREEN,
      INDEX_WHITE,
      (index - BRISK_INDEX) / (FAIR_INDEX - BRISK_INDEX),
    );
  }

  return blend(INDEX_WHITE, SHARE_RED, timeIndexRedness(index));
}
