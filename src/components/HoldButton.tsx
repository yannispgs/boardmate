"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long the finger has to stay down for the action to fire. */
const HOLD_MS = 1000;
const R = 9; // progress ring radius
const C = 2 * Math.PI * R;

/**
 * A button that only fires once it has been **held** for a second, with a ring
 * filling up as it goes.
 *
 * It stands in for a confirmation dialog on an action that is taken often but
 * cannot be undone: a dialog asks the same question every single time and gets
 * dismissed on reflex, where a deliberate hold is its own answer — and letting
 * go before the ring closes is the cancel.
 */
export function HoldButton({
  children,
  onHold,
  disabled = false,
  className = "",
}: Readonly<{
  children: React.ReactNode;
  onHold: () => void;
  disabled?: boolean;
  className?: string;
}>) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const startedAt = useRef(0);
  // Read through a ref: the animation loop is started once and would otherwise
  // hold on to the handler it was given on that render.
  const fire = useRef(onHold);
  fire.current = onHold;

  const cancel = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }

    setProgress(0);
  }, []);

  // Let go of the loop if the button disappears mid-hold (the turn advancing,
  // the game ending) — the action must not fire once it is gone.
  useEffect(() => cancel, [cancel]);

  const tick = useCallback(() => {
    const done = (performance.now() - startedAt.current) / HOLD_MS;

    if (done < 1) {
      setProgress(done);
      frame.current = requestAnimationFrame(tick);

      return;
    }

    cancel();
    fire.current();
  }, [cancel]);

  function begin() {
    if (disabled || frame.current !== null) {
      return;
    }

    startedAt.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      // A long press otherwise scrolls the page on Android and pops the
      // selection callout on iOS, both of which abort the hold.
      onContextMenu={e => e.preventDefault()}
      style={{ touchAction: "none" }}
      className={`flex select-none items-center justify-center ${className}`}
    >
      {children}

      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        className="shrink-0"
        aria-hidden
      >
        <title>Progression de l'appui</title>
        <circle
          cx="12"
          cy="12"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.25"
        />
        <circle
          cx="12"
          cy="12"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          transform="rotate(-90 12 12)"
        />
      </svg>
    </button>
  );
}
