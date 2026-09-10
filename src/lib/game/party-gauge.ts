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
 * Tonight sets the scale as much as the parties before it (owner, 2026-09-05).
 * The ends still read as records — tonight below everything *becomes* the
 * lowest and lands on 0, above everything *becomes* the highest and lands on 1,
 * so the fill is the same figure either way. What changes is the marks. Built
 * on the past alone, the scale ran min-to-max over it, which pinned the two
 * parties that set it to the very ends of the bar — on a two-party history,
 * that was **both** of them, every time, whatever they measured, and a bar's
 * worth of marks said nothing at all. Stretching the scale to hold tonight
 * pulls them inside the moment tonight is a record, and the distance between
 * the fill and the crowd becomes the reading: marks bunched far behind a full
 * bar is « de loin le plus long », a mark just under it is « d'un cheveu ».
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

  const lowest = Math.min(...past);
  const highest = Math.max(...past);

  if (highest === lowest) {
    return {
      fill: value === lowest ? MIDDLE : Number(value > lowest),
      marks: [MIDDLE],
    };
  }

  // Widened to hold tonight, so nothing is ever clamped: a party outside the
  // history moves the end rather than piling onto it.
  const min = Math.min(lowest, value);
  const max = Math.max(highest, value);
  const width = max - min;

  const at = (v: number) => {
    return (v - min) / width;
  };

  return { fill: at(value), marks: past.map(at) };
}
