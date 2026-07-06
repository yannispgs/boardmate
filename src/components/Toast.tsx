"use client";

import { useEffect, useState } from "react";

/**
 * A transient notification banner pinned to the top of the page. Slides in,
 * auto-dismisses after `durationMs`, and can be closed by hand. Purely
 * presentational — the parent owns "is there a message" and clears it via
 * `onDismiss` (also called when the timer elapses).
 */
export function Toast({
  message,
  onDismiss,
  durationMs = 6000,
}: {
  message: React.ReactNode;
  onDismiss: () => void;
  durationMs?: number;
}) {
  // Mount hidden, then flip on the next frame so the slide/fade transition runs.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const timer = setTimeout(onDismiss, durationMs);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [onDismiss, durationMs]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center p-3">
      <div
        className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 shadow-lg transition-all duration-300 dark:bg-amber-950 dark:text-amber-100 ${
          shown ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        <span className="min-w-0">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          className="-mr-1 shrink-0 rounded-md px-1.5 text-amber-700 transition hover:bg-amber-500/10 dark:text-amber-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
