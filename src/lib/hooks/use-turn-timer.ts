"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTurnTimer {
  /** Active seconds elapsed this turn (paused time excluded). */
  elapsedS: number;
  running: boolean;
  toggle: () => void;
  pause: () => void;
  /** Zeroes the elapsed time and starts running again (call per new turn). */
  reset: () => void;
}

/**
 * Counts the active time of the current turn (excluding pauses), counting up.
 * The play screen derives the remaining countdown from this and the chosen turn
 * duration. Mono-device and in-memory in v1 (not reload-resilient).
 *
 * Driven by requestAnimationFrame rather than setInterval: iOS throttles
 * setInterval aggressively (notably during audio playback), which made a second
 * occasionally flash by in under a second. The fractional elapsed lives in a ref
 * and only reaches React state when the whole-second changes, so we still
 * re-render at most once per second.
 */
export function useTurnTimer(): UseTurnTimer {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(true);
  const elapsedRef = useRef(0);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      lastTick.current = null;
      return;
    }

    lastTick.current = performance.now();
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      elapsedRef.current += now - (lastTick.current ?? now);
      lastTick.current = now;

      const total = elapsedRef.current;
      setElapsedMs(prev =>
        Math.floor(total / 1000) !== Math.floor(prev / 1000) ? total : prev,
      );

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [running]);

  const toggle = useCallback(() => setRunning(r => !r), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    elapsedRef.current = 0;
    lastTick.current = performance.now();
    setElapsedMs(0);
    setRunning(true);
  }, []);

  return {
    elapsedS: Math.floor(elapsedMs / 1000),
    running,
    toggle,
    pause,
    reset,
  };
}
