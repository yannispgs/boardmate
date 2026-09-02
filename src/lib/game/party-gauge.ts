/**
 * How full one figure's bar is, read against the same figure on the parties
 * before it.
 *
 * This is the « La partie » counterpart of {@link ./recap-spread.spread}, and
 * the two say different things on purpose. A player's bar is a **track with a
 * cursor** — the question there is « où je me situe », and both ends belong to
 * the same player. A party's bar is a **level**: empty means this evening sat at
 * the bottom of everything the table has done on this game, full means it sat at
 * the top. Read across a grid of six tiles, a level answers « quelle soirée
 * c'était » in one sweep, which a row of cursors does not.
 *
 * Pure: no vendor types, unit-tested.
 */

/** A filled bar, with the parties that set its scale marked along it. */
export interface Gauge {
  /** How much of the bar is painted, 0 = the lowest, 1 = the highest. */
  fill: number;
  /**
   * Each past party at its place along the same scale, 0 = left, 1 = right.
   *
   * They are what keeps the fill honest. Five parties bunched near the top
   * leave a fill of 0.9 looking like a fine evening when it was in fact the
   * second worst of the six; the marks show the crowd, so the reader sees the
   * cursor sitting just under it rather than near a ceiling.
   */
  marks: number[];
}

/** Where a history with no width of its own is drawn: dead centre. */
const MIDDLE = 0.5;

/**
 * The bar behind one figure, or `null` when there is nothing to place it
 * against — a first party on this game, and nothing else.
 *
 * The scale is set by the **past** parties alone, never by tonight. That is what
 * makes the two ends readable as records: tonight below everything clamps the
 * fill to 0 and tonight above everything clamps it to 1, so an empty bar and a
 * full one each mean something, instead of being the two values every scale
 * hands out for free.
 *
 * ⚠️ A history can have **no width**: one party before this one, or several that
 * all landed on the same figure. There is no scale to stretch then — but there
 * is still an answer, and it is the one a reader most wants on a second party:
 * longer, shorter, or the same. So the reference is drawn as a single mark in
 * the middle and the bar goes empty, half or full against it. Returning null
 * there would have hidden the bar on exactly the evenings that start a history
 * — which is what it did, on a table that had played a game twice.
 */
export function gauge(past: readonly number[], value: number): Gauge | null {
  if (past.length === 0) {
    return null;
  }

  const min = Math.min(...past);
  const max = Math.max(...past);
  const width = max - min;

  if (width === 0) {
    return {
      fill: value === min ? MIDDLE : Number(value > min),
      marks: [MIDDLE],
    };
  }

  const at = (v: number) => {
    return Math.min(1, Math.max(0, (v - min) / width));
  };

  return { fill: at(value), marks: past.map(at) };
}
