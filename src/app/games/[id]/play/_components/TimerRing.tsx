"use client";

import { useEffect, useRef } from "react";
import { countdownColor } from "@/lib/game/colors";
import { BEEP_URL, playSound, RING_URL } from "./play-audio";

const RING_SIZE = 240;
const RING_STROKE = 14;

/** Neutral "on hold" colour (violet-500) the ring/readout adopt while paused. */
const PAUSE_COLOR = "#8b5cf6";

/** Formats a seconds count as raw seconds under a minute, else m:ss. */
function formatClock(totalS: number): string {
  if (totalS >= 60) {
    const minutes = Math.floor(totalS / 60);
    const seconds = totalS % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return String(totalS);
}

/** What the readout counts in, so the unit under it agrees with the number. */
function countdownUnit(remainingS: number): string {
  if (remainingS < 60) {
    return "secondes";
  }

  return remainingS >= 120 ? "minutes" : "minute";
}

/**
 * The big ring readout. Under a minute we show raw seconds; from a minute up we
 * switch to m:ss so long turns (e.g. "3:00") stay readable instead of "180".
 * Once the turn runs out the readout flips to a count-up of the overtime taken
 * (prefixed with "+").
 */
function formatCountdown(remainingS: number): { value: string; label: string } {
  if (remainingS < 0) {
    return { value: `+${formatClock(-remainingS)}`, label: "dépassement" };
  }

  if (remainingS === 0) {
    return { value: "0", label: "temps écoulé" };
  }

  return { value: formatClock(remainingS), label: countdownUnit(remainingS) };
}

export function TimerRing({
  remainingS,
  durationS,
  running,
  onToggle,
  size = RING_SIZE,
}: Readonly<{
  remainingS: number;
  durationS: number;
  running: boolean;
  onToggle: () => void;
  /** Outer diameter in px; smaller when the dice bar shares the screen. */
  size?: number;
}>) {
  const r = (size - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  const paused = !running;
  const overtime = remainingS < 0;
  // Running past zero → alarm: fill the ring and pulse it red (paused overtime
  // stays the neutral hold colour instead).
  const alarming = overtime && !paused;
  const ringColor = paused
    ? PAUSE_COLOR
    : countdownColor(remainingS, durationS);
  const progress = overtime
    ? 1
    : Math.max(0, Math.min(1, remainingS / durationS));
  const display = formatCountdown(remainingS);

  // A beep on each of the last 10 seconds, then the ring at 0 (real sounds
  // ported from board-nest). Paused → silent (the effect bails on !running).
  const beepedAt = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!running) {
      return;
    }

    if (remainingS >= 1 && remainingS <= 10) {
      playSound(BEEP_URL, 0.6, beepedAt.current, remainingS);
    }

    if (remainingS === 0) {
      playSound(RING_URL, 1, beepedAt.current, 0);
    }

    if (remainingS > 10) {
      beepedAt.current.clear();
    }
  }, [remainingS, running]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={running ? "Mettre en pause" : "Reprendre"}
      className="relative"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <title>Chronomètre du tour</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          className="text-black/10 dark:text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={alarming ? "animate-overtime-ring" : undefined}
          style={{
            transition: "stroke-dashoffset 0.3s linear, stroke 0.2s ease",
          }}
        />
      </svg>

      {/* Big pause glyph fading in behind the readout while on hold. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200"
        style={{ opacity: paused ? 0.25 : 0 }}
      >
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 24 24"
          fill={PAUSE_COLOR}
          aria-hidden
        >
          <title>Pause</title>
          <rect x="6" y="5" width="4" height="14" rx="1.5" />
          <rect x="14" y="5" width="4" height="14" rx="1.5" />
        </svg>
      </span>

      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-5xl font-bold tabular-nums ${
            alarming ? "animate-overtime-text" : ""
          }`}
          style={
            alarming
              ? undefined
              : { color: ringColor, transition: "color 0.2s ease" }
          }
        >
          {display.value}
        </span>
        <span className="text-xs uppercase tracking-wide text-zinc-400">
          {display.label}
        </span>
        {paused ? (
          <span className="mt-1 text-xs font-semibold text-zinc-500">
            EN PAUSE
          </span>
        ) : null}
      </span>
    </button>
  );
}
