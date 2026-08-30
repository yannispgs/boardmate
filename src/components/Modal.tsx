"use client";

import { type ReactNode, useEffect } from "react";

import { registerOverlay } from "@/lib/ui/overlay-registry";

/**
 * Full-screen modal shell: dims the page, centres its card, and (by default)
 * closes when you click the backdrop — clicks inside the card don't bubble out.
 * `className` styles the card itself. Every in-app modal builds on this so they
 * dismiss the same way.
 *
 * Set `dismissable={false}` for a modal where an outside click would throw away
 * work in progress (e.g. the category scoresheet mid-entry): then only its own
 * close/cancel control shuts it.
 *
 * It fades **in** and leaves at once. Fading out would mean staying mounted
 * after `onClose`, the way `Drawer` does — and a drawer can, because its caller
 * hands it an `open` flag. A modal's caller stops rendering it instead, in the
 * nineteen places one is opened. Closing reveals the page that was asked for,
 * which is its own reward; arriving is the half that needed announcing.
 */
export function Modal({
  onClose,
  dismissable = true,
  label,
  className,
  children,
}: Readonly<{
  onClose: () => void;
  dismissable?: boolean;
  label?: string;
  className?: string;
  children: ReactNode;
}>) {
  // The page underneath is pinned while the modal is up: a drag that starts
  // anywhere but on a scrollable part of the card would otherwise scroll it,
  // which reads as the modal ignoring the gesture entirely.
  useEffect(() => {
    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Announce it to the rest of the app, which is how the play screen knows not
  // to dim itself over a modal somebody is reading.
  useEffect(() => registerOverlay(), []);

  return (
    // Accessibility is out of scope for this app, so the backdrop stays a plain
    // div carrying the dialog role rather than becoming a <dialog>, and it
    // closes on click with no keyboard equivalent. Sonar has four rules to say
    // otherwise; the NOSONAR below answers all of them at once.
    <div // NOSONAR
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={dismissable ? onClose : undefined}
      className="overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      {/* Clicks inside the card are its own; they must not reach the backdrop.
          The card fades on the backdrop's own beat rather than a beat of its
          own: two overlapping fades read as one arrival, two staggered ones
          read as a page that is still loading. */}
      <div // NOSONAR: same call as above.
        className={`overlay-in ${className ?? ""}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
