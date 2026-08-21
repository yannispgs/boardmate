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
    return { placement: "below", maxHeight: roomFor(preferredHeight, below) };
  }

  return { placement: "above", maxHeight: roomFor(preferredHeight, above) };
}

/** The horizontal span of a box — all a sideways fit needs of a rectangle. */
export interface HorizontalBounds {
  left: number;
  right: number;
}

/** Where a panel starts sideways, and how wide it may be once it is there. */
export interface HorizontalFit {
  left: number;
  width: number;
}

/**
 * Fits a panel sideways into `viewport`, hanging from its anchor's right edge.
 *
 * Opening leftward is what keeps a panel anchored to an icon near the right of
 * the screen from spilling off it — but a short caption puts that same icon
 * near the *left* edge, and the panel then runs off the other side, where
 * nothing can bring it back: it is fixed to the viewport, so there is nothing
 * to scroll. Both ends are therefore clamped, and the panel narrowed first when
 * the screen is too narrow to hold it whole.
 */
export function horizontalFit(
  anchor: HorizontalBounds,
  viewport: HorizontalBounds,
  preferredWidth: number,
  margin = 8,
): HorizontalFit {
  const width = roomFor(
    preferredWidth,
    viewport.right - viewport.left - 2 * margin,
  );
  const leftmost = viewport.left + margin;
  const rightmost = viewport.right - margin - width;

  return {
    width,
    left: Math.max(leftmost, Math.min(anchor.right - width, rightmost)),
  };
}

/** The room available, never more than asked for and never negative. */
function roomFor(preferred: number, room: number): number {
  return Math.max(0, Math.min(preferred, room));
}
