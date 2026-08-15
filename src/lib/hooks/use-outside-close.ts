"use client";

import { type RefObject, useEffect } from "react";

/**
 * Closes an open panel when a pointer goes down anywhere outside `ref`.
 *
 * A dropdown anchored to a text field cannot close on the field's `blur`: the
 * keyboard is dismissed by blurring the field, and doing so must leave the list
 * standing so it can be picked from. Watching the document instead separates
 * the two — losing focus and being dismissed become different gestures.
 */
export function useOutsideClose(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", onDown);

    return () => document.removeEventListener("pointerdown", onDown);
  }, [ref, open, onClose]);
}
