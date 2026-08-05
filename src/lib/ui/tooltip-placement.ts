/** Which side of its trigger a tooltip bubble opens on. */
export type TooltipPlacement = "top" | "bottom";

/** The vertical span of a box — all a placement decision needs of a rectangle. */
export interface VerticalBounds {
  top: number;
  bottom: number;
}

/**
 * Picks the side a tooltip should open on so it stays inside `bounds` — the
 * scrolling area that would otherwise clip it.
 *
 * Above is preferred: the bubble then covers what the reader has already gone
 * past rather than what they are heading towards. It flips below as soon as the
 * room above is too tight, which is what happens to the first card of a list.
 * When neither side fits, above wins again — a bubble clipped at the top beats
 * one pushed off the bottom by a sticky action bar.
 */
export function tooltipPlacement(
  trigger: VerticalBounds,
  bounds: VerticalBounds,
  bubbleHeight: number,
): TooltipPlacement {
  const roomAbove = trigger.top - bounds.top;

  if (roomAbove >= bubbleHeight) {
    return "top";
  }

  const roomBelow = bounds.bottom - trigger.bottom;

  return roomBelow >= bubbleHeight ? "bottom" : "top";
}
