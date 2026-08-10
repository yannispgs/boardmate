"use client";

import { type ReactNode, useRef, useState } from "react";

import type {
  TooltipPlacement,
  VerticalBounds,
} from "@/lib/ui/tooltip-placement";
import { tooltipPlacement } from "@/lib/ui/tooltip-placement";

/**
 * Room the bubble asks for on a side before opening there. A rough upper bound
 * (a five-player list) rather than a measurement: the bubble is only laid out
 * once it opens, so there is nothing to measure at decision time, and erring
 * generous simply flips a borderline case downwards.
 */
const BUBBLE_HEIGHT = 96;

/** Whether an element scrolls, and would therefore clip a bubble leaving it. */
function scrolls(el: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(el);

  return (
    overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay"
  );
}

/**
 * The area the bubble has to stay inside: the nearest scrolling ancestor, else
 * the viewport.
 */
function clippingBounds(el: HTMLElement): VerticalBounds {
  let node = el.parentElement;

  while (node) {
    if (scrolls(node)) {
      return node.getBoundingClientRect();
    }

    node = node.parentElement;
  }

  return { top: 0, bottom: window.innerHeight };
}

/**
 * A small hover tooltip: wraps an inline trigger and shows `label` in a dark
 * rounded bubble beside it on hover. `label` is a ReactNode, so it can be plain
 * text or rich content (e.g. a list with one item emphasised).
 *
 * The bubble opens **above** the trigger, and flips below when the room above is
 * too tight — otherwise the first card of a scrolling list gets its bubble
 * sliced off by the top of the list. The side is decided when the pointer
 * arrives, since it depends on where the trigger has been scrolled to.
 *
 * The group is **named**: a bare `group-hover:` reacts to *any* ancestor
 * carrying `group`, so hovering a section that happens to use one — the
 * collapsible games list uses it for its chevron — would pop every tooltip it
 * contains at once. Naming ties each bubble to its own trigger.
 */
export function Tooltip({
  label,
  children,
}: Readonly<{
  label: ReactNode;
  children: ReactNode;
}>) {
  const trigger = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<TooltipPlacement>("top");

  function pickSide() {
    const el = trigger.current;

    /* c8 ignore next 3 -- defensive: the ref is set by the time a pointer
       reaches the element it is attached to */
    if (!el) {
      return;
    }

    setPlacement(
      tooltipPlacement(
        el.getBoundingClientRect(),
        clippingBounds(el),
        BUBBLE_HEIGHT,
      ),
    );
  }

  const side = placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5";

  return (
    <span
      ref={trigger}
      onPointerEnter={pickSide}
      className="group/tooltip relative inline-flex cursor-help"
    >
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 whitespace-pre rounded-md bg-zinc-900 px-2 py-1 text-left text-xs font-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 dark:bg-zinc-700 ${side}`}
      >
        {label}
      </span>
    </span>
  );
}
