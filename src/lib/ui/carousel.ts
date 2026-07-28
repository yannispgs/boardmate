/**
 * The arithmetic behind a carousel: which slide a step or a swipe lands on.
 * Kept out of the component so both can be pinned by tests — a gesture that
 * flips the wrong way, or an arrow that dead-ends, is invisible in a screenshot.
 */

/** Sideways travel, in pixels, below which a drag is a stray touch. */
const SWIPE_MIN = 40;

/**
 * The slide `delta` steps away from `current`, wrapping round both ends: the
 * arrows walk a ring, so neither of them is ever the one that does nothing.
 */
export function stepIndex(
  current: number,
  delta: number,
  count: number,
): number {
  if (count <= 0) {
    return 0;
  }

  return (((current + delta) % count) + count) % count;
}

/**
 * What a drag asks for: `1` when it went left (the next slide comes in from the
 * right), `-1` when it went right, and `0` when it was too short or more
 * vertical than horizontal — scrolling down a slide must not flip the one under
 * the finger.
 */
export function swipeStep(dx: number, dy: number): number {
  if (Math.abs(dx) < SWIPE_MIN || Math.abs(dy) > Math.abs(dx)) {
    return 0;
  }

  return dx < 0 ? 1 : -1;
}
