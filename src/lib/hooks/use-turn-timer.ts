"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTurnTimer {
  /** Active seconds elapsed this turn (paused time excluded). */
  elapsedS: number;
  running: boolean;
  toggle: () => void;
  pause: () => void;
  /**
   * Pauses accumulated this turn (each ≥ 5 s). Finalizes an in-progress pause,
   * so it's accurate even when called while paused (e.g. advancing mid-pause).
   */
  pauseStats: () => { count: number; durationS: number };
  /** Zeroes the elapsed time and starts running again (call per new turn). */
  reset: () => void;
}

/** How often the clock ticks. Coarse on purpose — see the note below. */
const TICK_MS = 500;
/** A pause must last this long to be counted (ignore accidental taps). */
const MIN_PAUSE_MS = 5000;

/**
 * Counts the active time of the current turn (excluding pauses), counting up.
 * The play screen derives the remaining countdown from this and the chosen turn
 * duration. Mono-device and in-memory in v1 (not reload-resilient).
 *
 * Driven by a **coarse `setInterval`** (not `requestAnimationFrame`) to save
 * battery: a board-game timer only needs second resolution, so ticking a couple
 * of times a second instead of ~60 keeps the phone's CPU/GPU mostly idle over a
 * long game. `elapsedRef` still accumulates *real* wall-clock time from
 * timestamps, so the recorded duration stays accurate — and the display snaps
 * straight to the real elapsed seconds (e.g. after the screen was locked), no
 * slow catch-up.
 */
export function useTurnTimer(): UseTurnTimer {
  const [elapsedS, setElapsedS] = useState(0);
  const [running, setRunning] = useState(true);
  const elapsedRef = useRef(0); // active ms accumulated (excludes pauses)
  const lastTick = useRef<number | null>(null);
  const pauseStart = useRef<number | null>(null); // perf.now() a pause began
  const pausedMs = useRef(0); // total qualifying paused ms this turn
  const pauseTally = useRef(0); // count of qualifying pauses this turn

  // Closes an in-progress pause: if it reached the threshold it's tallied. When
  // `keepPaused` (still paused, just taking a snapshot), the clock restarts so a
  // continuing pause isn't double-counted.
  const commitPause = useCallback((keepPaused: boolean) => {
    if (pauseStart.current === null) {
      return;
    }

    const now = performance.now();
    if (now - pauseStart.current >= MIN_PAUSE_MS) {
      pauseTally.current += 1;
      pausedMs.current += now - pauseStart.current;
    }
    pauseStart.current = keepPaused ? now : null;
  }, []);

  useEffect(() => {
    if (!running) {
      lastTick.current = null;
      pauseStart.current = performance.now(); // a pause just began

      return;
    }

    commitPause(false); // resuming → close any pause
    lastTick.current = performance.now();
    const tick = () => {
      const now = performance.now();
      elapsedRef.current += now - (lastTick.current ?? now);
      lastTick.current = now;
      // Snap straight to the real elapsed seconds (accurate across stalls or a
      // locked screen; no per-frame smoothing needed at this tick rate).
      setElapsedS(Math.floor(elapsedRef.current / 1000));
    };
    const id = setInterval(tick, TICK_MS);

    return () => clearInterval(id);
  }, [running, commitPause]);

  const toggle = useCallback(() => setRunning(r => !r), []);
  const pause = useCallback(() => setRunning(false), []);
  const pauseStats = useCallback(() => {
    commitPause(true); // fold in a pause still in progress at this instant

    return {
      count: pauseTally.current,
      durationS: Math.round(pausedMs.current / 1000),
    };
  }, [commitPause]);
  const reset = useCallback(() => {
    elapsedRef.current = 0;
    lastTick.current = performance.now();
    pauseStart.current = null;
    pausedMs.current = 0;
    pauseTally.current = 0;
    setElapsedS(0);
    setRunning(true);
  }, []);

  return {
    elapsedS,
    running,
    toggle,
    pause,
    pauseStats,
    reset,
  };
}
