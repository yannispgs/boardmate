"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { InfoIcon } from "./icons";

/**
 * A small "i" info icon that toggles a concise explanatory bubble on click, for
 * values whose meaning is not self-evident (normalised or derived metrics).
 * Clicking anywhere outside the bubble dismisses it. Unlike {@link Tooltip}
 * (hover-only, unreachable on touch), this is tap-friendly on phones.
 *
 * The bubble is rendered in a portal on `document.body` with fixed positioning,
 * so it is never clipped by an ancestor's `overflow-hidden` (tables, cards).
 */
export function InfoTip({
  label = "Informations",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        buttonRef.current?.contains(target) ||
        bubbleRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function toggle() {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      // Anchor the bubble's right edge under the icon so it opens leftward and
      // never spills off the right of narrow phone screens.
      setPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }

    setOpen(previous => !previous);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        className="inline-flex text-zinc-400 transition-colors [@media(hover:hover)]:hover:text-zinc-600 dark:[@media(hover:hover)]:hover:text-zinc-200"
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={bubbleRef}
              id={id}
              data-testid="info-bubble"
              style={{ position: "fixed", top: pos.top, right: pos.right }}
              className="z-50 w-60 rounded-lg border border-black/10 bg-white p-2.5 text-left text-xs font-normal leading-relaxed text-zinc-600 shadow-xl dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
