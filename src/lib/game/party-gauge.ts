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

/**
 * The bar behind one figure, or `null` when there is nothing to place it
 * against.
 *
 * Null covers the two cases that have no scale rather than an empty one: a
 * first party on this game, and a run of parties that all landed on the same
 * figure. Both would otherwise divide by a width of zero — and, worse, a bar
 * drawn empty would claim « the lowest ever », which is a statement about a
 * history that does not exist.
 *
 * The scale is set by the **past** parties alone, never by tonight. That is what
 * makes the two ends readable as records: tonight below everything clamps the
 * fill to 0 and tonight above everything clamps it to 1, so an empty bar and a
 * full one each mean something, instead of being the two values every scale
 * hands out for free.
 */
export function gauge(past: readonly number[], value: number): Gauge | null {
  if (past.length === 0) {
    return null;
  }

  const min = Math.min(...past);
  const max = Math.max(...past);
  const width = max - min;

  if (width === 0) {
    return null;
  }

  const at = (v: number) => {
    return Math.min(1, Math.max(0, (v - min) / width));
  };

  return { fill: at(value), marks: past.map(at) };
}
