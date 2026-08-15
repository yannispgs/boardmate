"use client";

import { type RefObject, useEffect, useState } from "react";

import {
  type DropdownSpace,
  dropdownSpace,
  type VerticalBounds,
} from "@/lib/ui/dropdown-space";

/**
 * Measures the room an open dropdown has, and keeps measuring while it is open.
 *
 * 🔑 It reads `window.visualViewport`, not `window.innerHeight`: on iOS the
 * layout viewport does **not** shrink when the keyboard comes up, so
 * `innerHeight` still reports a screen whose bottom half is covered. The visual
 * viewport is the part actually on show, and it fires `resize` as the keyboard
 * opens and closes — which is exactly when a list anchored to a focused search
 * field needs to be re-fitted.
 *
 * Returns `null` until the first measurement, so the caller can render its
 * plain CSS height on the server and during the first paint.
 */
export function useDropdownSpace(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  preferredHeight: number,
): DropdownSpace | null {
  const [space, setSpace] = useState<DropdownSpace | null>(null);

  useEffect(() => {
    if (!open) {
      setSpace(null);

      return;
    }

    const measure = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();

      if (!anchor) {
        return;
      }

      setSpace(dropdownSpace(anchor, visibleBounds(), preferredHeight));
    };

    measure();

    const viewport = window.visualViewport;

    // `scroll` matters as much as `resize`: iOS scrolls the visual viewport on
    // its own to bring a focused field above the keyboard, which moves the
    // anchor without ever resizing anything.
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);

    return () => {
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [anchorRef, open, preferredHeight]);

  return space;
}

/**
 * The slice of the page actually on show, in the same coordinates
 * `getBoundingClientRect` uses.
 */
function visibleBounds(): VerticalBounds {
  const viewport = window.visualViewport;

  if (!viewport) {
    return { top: 0, bottom: window.innerHeight };
  }

  return {
    top: viewport.offsetTop,
    bottom: viewport.offsetTop + viewport.height,
  };
}
