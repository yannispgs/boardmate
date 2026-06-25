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
 * The play screen derives the remaining countdown from this and the chosen
 * turn duration. Mono-device and in-memory in v1 (not reload-resilient).
 */
export function useTurnTimer(): UseTurnTimer {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(true);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      lastTick.current = null;
      return;
    }
    lastTick.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const last = lastTick.current ?? now;
      lastTick.current = now;
      setElapsedMs(ms => ms + (now - last));
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  const toggle = useCallback(() => setRunning(r => !r), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setElapsedMs(0);
    lastTick.current = null;
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
