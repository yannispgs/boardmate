/** Which side of its anchor a dropdown panel opens on. */
export type DropdownPlacement = "above" | "below";

/** The vertical span of a box — all a placement decision needs of a rectangle. */
export interface VerticalBounds {
  top: number;
  bottom: number;
}

/** Where a dropdown should open, and how tall it may be once it is there. */
export interface DropdownSpace {
  placement: DropdownPlacement;
  maxHeight: number;
}

/**
 * Fits a dropdown into the room its anchor actually has, inside `viewport`.
 *
 * On a phone that viewport is not the window: the on-screen keyboard covers the
 * bottom half of it while a search field is focused, and a list anchored under
 * that field opens straight into the covered part. On a screen that has nothing
 * to scroll, none of it can be brought back up. So the panel is told how tall it
 * may be rather than being given a fixed height, and it scrolls inside instead.
 *
 * Below is preferred — a list belongs under what it completes, and flipping it
 * on every keystroke as the match count changes would be worse than a short
 * list. It only flips above when below is both too short for the panel and the
 * poorer of the two sides.
 */
export function dropdownSpace(
  anchor: VerticalBounds,
  viewport: VerticalBounds,
  preferredHeight: number,
  gap = 4,
): DropdownSpace {
  const below = viewport.bottom - anchor.bottom - gap;
  const above = anchor.top - viewport.top - gap;

  if (below >= preferredHeight || below >= above) {
    return { placement: "below", maxHeight: fit(preferredHeight, below) };
  }

  return { placement: "above", maxHeight: fit(preferredHeight, above) };
}

/** The room available, never more than asked for and never negative. */
function fit(preferred: number, room: number): number {
  return Math.max(0, Math.min(preferred, room));
}
