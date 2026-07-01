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

/** Minimum wall-clock a displayed second is held before it may change. */
const MIN_STEP_MS = 900;

/**
 * Counts the active time of the current turn (excluding pauses), counting up.
 * The play screen derives the remaining countdown from this and the chosen turn
 * duration. Mono-device and in-memory in v1 (not reload-resilient).
 *
 * Driven by requestAnimationFrame. Two things matter and pull against each
 * other on iOS/WebKit, where the render loop periodically stalls a few hundred
 * ms (notably during audio playback):
 *
 *  - `elapsedRef` accumulates *real* active time, so the recorded turn duration
 *    stays true to the wall clock across stalls.
 *  - the *shown* second is only allowed to advance once per ~second of real
 *    time (`MIN_STEP_MS`). A stall that straddles a second boundary otherwise
 *    bunches two crossings together and one number flashes by in well under a
 *    second. We'd rather the display lag by a stall's worth — sub-second, and
 *    invisible over a turn — than stutter.
 */
export function useTurnTimer(): UseTurnTimer {
  const [elapsedS, setElapsedS] = useState(0);
  const [running, setRunning] = useState(true);
  const elapsedRef = useRef(0); // active ms accumulated (excludes pauses)
  const lastTick = useRef<number | null>(null);
  const lastStepAt = useRef(0); // perf.now() of the last visible increment

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

      setElapsedS(prev => {
        const target = Math.floor(elapsedRef.current / 1000);

        if (target > prev && now - lastStepAt.current >= MIN_STEP_MS) {
          lastStepAt.current = now;

          return prev + 1;
        }

        return prev;
      });

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
    lastStepAt.current = performance.now();
    setElapsedS(0);
    setRunning(true);
  }, []);

  return {
    elapsedS,
    running,
    toggle,
    pause,
    reset,
  };
}
