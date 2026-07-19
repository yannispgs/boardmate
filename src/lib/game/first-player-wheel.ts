/**
 * Pure logic for a "wheel of fortune". Like a real wheel, it spins and stops at
 * a **random angle**; the winner is simply whoever's segment sits under the top
 * pointer once it settles ({@link winningIndexAt}). {@link rotateToFirst} then
 * moves that winner to the front of a turn order for the first-player wheel.
 */

/** A uniform fraction in [0, 1), from the crypto RNG (not `Math.random`). */
export function randomFraction(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/**
 * A random forward stop angle (degrees, clockwise): at least `turns` full turns
 * past `current`, plus a uniform random angle within the final turn — so the
 * wheel stops wherever it lands, not aligned to any segment. `rand` is
 * injectable for tests.
 */
export function randomStopRotation(
  current: number,
  turns = 5,
  rand: () => number = randomFraction,
): number {
  return current + turns * 360 + rand() * 360;
}

/**
 * The index of the segment under the top pointer when a wheel of `count` equal
 * segments is rotated by `rotation` degrees clockwise. Segment `i` spans
 * `[i·seg, (i+1)·seg)` clockwise from the top; the point at the top maps to the
 * wheel's local angle `−rotation`.
 */
export function winningIndexAt(rotation: number, count: number): number {
  if (count <= 0) {
    return 0;
  }

  const seg = 360 / count;
  const local = ((-rotation % 360) + 360) % 360;

  return Math.floor(local / seg);
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
