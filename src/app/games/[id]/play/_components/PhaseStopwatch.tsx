"use client";

import { formatDuration } from "@/lib/game/format-time";

const DISC_SIZE = 240;

/** Blue-500 — the table's colour, distinct from the turn ring's countdown scale. */
const DISC_COLOR = "#3b82f6";
/** Neutral "on hold" colour (violet-500), the same one the turn ring adopts. */
const PAUSE_COLOR = "#8b5cf6";

/**
 * The table stopwatch, for a phase everybody plays at once.
 *
 * Deliberately **not** a countdown: nothing is allotted, so there is nothing to
 * run out of and no arc to empty. A full disc that only breathes — owner's
 * call, 2026-08-17 — says the clock is running without a moving hand pulling
 * eyes off the board every second.
 */
export function PhaseStopwatch({
  elapsedS,
  running,
  onToggle,
  label,
  size = DISC_SIZE,
}: Readonly<{
  elapsedS: number;
  running: boolean;
  onToggle: () => void;
  /** The phase being timed, read under the clock. */
  label: string;
  /** Outer diameter in px; smaller when the dice bar shares the screen. */
  size?: number;
}>) {
  const paused = !running;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={running ? "Mettre en pause" : "Reprendre"}
      className="relative"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <title>Chronomètre de la phase</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2}
          fill={paused ? PAUSE_COLOR : DISC_COLOR}
          className={paused ? undefined : "animate-phase-disc"}
        />
      </svg>

      <span className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-5xl font-bold tabular-nums drop-shadow">
          {formatDuration(elapsedS)}
        </span>
        <span className="mt-1 max-w-[80%] text-center text-xs font-semibold uppercase tracking-wide opacity-80">
          {label}
        </span>
        {paused ? (
          <span className="mt-1 text-xs font-semibold opacity-90">
            EN PAUSE
          </span>
        ) : null}
      </span>
    </button>
  );
}
