"use client";

import { type PointerEvent, type ReactNode, useRef } from "react";

import { swipeStep } from "@/lib/ui/carousel";

/**
 * What there is to step through, for a deck that has more than one thing to
 * show. `count` under two leaves the deck a plain frame: no arrows, and a drag
 * across it means nothing.
 */
export interface DeckNav {
  count: number;
  onStep: (delta: number) => void;
  /** What one slide is, for the arrows: « Scénario précédent ». */
  itemLabel: string;
}

/**
 * One of the two arrows leading to the next slide. They are pinned to the sides
 * of the deck rather than laid under it, so they hold the same spot whatever the
 * slide being read is doing — swiped across, or scrolled past its frame. Only
 * the arrow itself takes a tap: the column around it lets a swipe through to the
 * slide underneath.
 */
function StepArrow({
  side,
  itemLabel,
  onClick,
}: Readonly<{
  side: "previous" | "next";
  itemLabel: string;
  onClick: () => void;
}>) {
  const label = `${itemLabel} ${side === "previous" ? "précédent" : "suivant"}`;

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 flex w-11 items-center justify-center ${
        side === "previous" ? "left-0" : "right-0"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg shadow ring-1 ring-black/10 backdrop-blur transition hover:bg-white dark:bg-zinc-800/85 dark:ring-white/15 dark:hover:bg-zinc-800"
      >
        {side === "previous" ? "‹" : "›"}
      </button>
    </div>
  );
}

/**
 * A frame you flip through: swipe it sideways, or take one of the two arrows
 * over its edges. Both say the same thing — a phone gets the gesture it expects,
 * a mouse gets something to click.
 *
 * Wrap **what is being compared** and nothing else: a drag reads as a flip, so
 * a deck laid over a settings panel would turn every slider into one.
 */
export function SwipeDeck({
  nav,
  className,
  contentClassName,
  children,
}: Readonly<{
  nav: DeckNav | null;
  /** The frame itself; it is positioned, for the arrows to hang off it. */
  className?: string;
  /** The part that takes the gesture — give it the scrolling, if any. */
  contentClassName?: string;
  children: ReactNode;
}>) {
  const from = useRef<{ x: number; y: number } | null>(null);
  const steps = nav !== null && nav.count > 1;

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    from.current = { x: event.clientX, y: event.clientY };
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const start = from.current;

    from.current = null;

    if (start === null || !steps) {
      return;
    }

    const delta = swipeStep(event.clientX - start.x, event.clientY - start.y);

    if (delta !== 0) {
      nav.onStep(delta);
    }
  }

  /**
   * The browser has taken the gesture over — a vertical scroll of the slide,
   * which `touch-pan-y` still leaves it — so no swipe is read out of it.
   */
  function cancelDrag() {
    from.current = null;
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* `touch-pan-y` keeps the sideways drag for the deck and leaves the
          up-and-down one to the slide. */}
      <div
        onPointerDown={startDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        className={`touch-pan-y ${contentClassName ?? ""}`}
      >
        {children}
      </div>

      {steps ? (
        <>
          <StepArrow
            side="previous"
            itemLabel={nav.itemLabel}
            onClick={() => nav.onStep(-1)}
          />
          <StepArrow
            side="next"
            itemLabel={nav.itemLabel}
            onClick={() => nav.onStep(1)}
          />
        </>
      ) : null}
    </div>
  );
}
