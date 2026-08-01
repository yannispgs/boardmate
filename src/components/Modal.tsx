"use client";

import { type ReactNode, useEffect } from "react";

/**
 * Full-screen modal shell: dims the page, centres its card, and (by default)
 * closes when you click the backdrop — clicks inside the card don't bubble out.
 * `className` styles the card itself. Every in-app modal builds on this so they
 * dismiss the same way.
 *
 * Set `dismissable={false}` for a modal where an outside click would throw away
 * work in progress (e.g. the category scoresheet mid-entry): then only its own
 * close/cancel control shuts it.
 */
export function Modal({
  onClose,
  dismissable = true,
  label,
  className,
  children,
}: {
  onClose: () => void;
  dismissable?: boolean;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={dismissable ? onClose : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className={className} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
