/**
 * Pure logic for the "wheel of fortune" that picks the first player at launch.
 * The wheel only elects who starts: the winner is moved to the front and the
 * others keep their relative order (a rotation of the turn order).
 */

/** A uniform fraction in [0, 1), from the crypto RNG (not `Math.random`). */
export function randomFraction(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/**
 * A uniform winning index in [0, count). `rand` is injectable for tests; it
 * defaults to {@link randomFraction}. Clamps the (vanishingly unlikely) 1.0 so
 * the index never reaches `count`.
 */
export function pickWinnerIndex(
  count: number,
  rand: () => number = randomFraction,
): number {
  if (count <= 0) {
    return 0;
  }

  return Math.min(count - 1, Math.floor(rand() * count));
}

/**
 * Rotates `items` so the one at `index` leads, the rest following in their
 * existing order. A non-positive index returns a copy unchanged.
 */
export function rotateToFirst<T>(items: T[], index: number): T[] {
  if (index <= 0) {
    return items.slice();
  }

  return [...items.slice(index), ...items.slice(0, index)];
}

/**
 * The absolute wheel rotation (degrees, clockwise) that lands segment
 * `winnerIndex` of `count` equal segments under the top pointer, always
 * spinning forward from `current` by at least `turns` full turns.
 *
 * Segment `i` is drawn from `i·seg` clockwise from the top, so its centre sits
 * at `i·seg + seg/2`; bringing that centre to the top needs `360 − centre`.
 */
export function nextRotation(
  current: number,
  count: number,
  winnerIndex: number,
  turns = 5,
): number {
  const seg = 360 / count;
  const centre = winnerIndex * seg + seg / 2;
  const target = 360 - centre;
  // Largest whole number of turns at or below the current angle, so the result
  // is always strictly ahead of `current` yet congruent to `target` mod 360.
  const base = current - (((current % 360) + 360) % 360);

  return base + turns * 360 + target;
}
