"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { horizontalFit } from "@/lib/ui/dropdown-space";
import { InfoIcon } from "./icons";

/** How wide the bubble opens when the screen has the room for it. */
const WIDTH = 240;

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
}: Readonly<{
  label?: string;
  children: ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
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

  function toggle(event: ReactMouseEvent) {
    // A button has no default action of its own, but its ancestors do: dropped
    // in a `summary`, the click that opens this bubble also closes the drawer
    // holding it — hiding what the bubble explains. Cancelled here once, rather
    // than by a wrapper around every such call site.
    event.preventDefault();

    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      // The bubble hangs off the icon and opens leftward, clamped so neither
      // end leaves the screen — it is fixed to the viewport, so anything that
      // does is unreadable for good.
      const top = rect.bottom + 6;

      setPos({
        top,
        ...horizontalFit(rect, { left: 0, right: window.innerWidth }, WIDTH),
        maxHeight: window.innerHeight - top - 8,
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
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
              }}
              // `leading-snug` keeps the lines of one sentence tight; `space-y`
              // sets a slightly larger gap between separate elements (each a
              // <p>), so distinct points read as distinct.
              className="z-50 space-y-1.5 overflow-y-auto rounded-lg border border-black/10 bg-white p-2.5 text-left text-xs font-normal leading-snug text-zinc-600 shadow-xl dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
