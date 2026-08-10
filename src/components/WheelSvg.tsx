"use client";

import { useState } from "react";

import {
  randomStopRotation,
  winningIndexAt,
} from "@/lib/game/first-player-wheel";

/** Segment fills, cycled across the entries (enough distinct hues for a table). */
const SEGMENT_COLORS = [
  "#6366f1", // indigo-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ec4899", // pink-500
  "#0ea5e9", // sky-500
  "#a855f7", // purple-500
  "#ef4444", // red-500
  "#14b8a6", // teal-500
];

const CENTER = 100;
const RADIUS = 96;

/** Point on the wheel at `angle` degrees clockwise from the top (12 o'clock). */
function polar(r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;

  return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
}

/** SVG path for the pie slice spanning `[from, to]` degrees (clockwise). */
function slicePath(from: number, to: number): string {
  const [x0, y0] = polar(RADIUS, from);
  const [x1, y1] = polar(RADIUS, to);
  const largeArc = to - from > 180 ? 1 : 0;

  return `M ${CENTER} ${CENTER} L ${x0} ${y0} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

/** The spin state machine, shared by every wheel (first player, standalone…). */
export interface WheelSpin {
  rotation: number;
  spinning: boolean;
  /** The landed index once the spin settles; `null` while idle/spinning. */
  settledIndex: number | null;
  spin: () => void;
  handleSettled: () => void;
  /** Clears the current result (e.g. after the entries change). */
  reset: () => void;
}

/**
 * Drives a spinning wheel over `count` equal segments: a press picks a
 * crypto-random winner and launches a decelerating spin that lands the top
 * pointer on it. Honours `prefers-reduced-motion` (jumps straight to the
 * result). The caller renders {@link WheelSvg} and its own result/actions.
 */
export function useWheelSpin(count: number): WheelSpin {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  // Only set once the spin settles — gates the result banner / confirm button.
  const [settledIndex, setSettledIndex] = useState<number | null>(null);

  function spin() {
    if (spinning || count <= 0) {
      return;
    }

    // Spin to a random stop angle; the winner is whoever's segment lands under
    // the pointer there.
    const stop = randomStopRotation(rotation);
    const index = winningIndexAt(stop, count);
    setWinnerIndex(index);
    setSettledIndex(null);
    setRotation(stop);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setSettledIndex(index);
    } else {
      setSpinning(true);
    }
  }

  function handleSettled() {
    setSpinning(false);

    if (winnerIndex !== null) {
      setSettledIndex(winnerIndex);
    }
  }

  function reset() {
    setWinnerIndex(null);
    setSettledIndex(null);
  }

  return { rotation, spinning, settledIndex, spin, handleSettled, reset };
}

/** One wheel slice: a stable `id` for React keys, a `label` to print. */
export interface WheelSegment {
  id: string;
  label: string;
}

/**
 * The wheel itself: a pointer at the top and one equal, coloured, labelled
 * segment per entry, rotated by the {@link useWheelSpin} state. Purely
 * presentational — `onSettled` fires when the spin transition ends.
 */
export function WheelSvg({
  segments,
  rotation,
  spinning,
  onSettled,
}: Readonly<{
  segments: WheelSegment[];
  rotation: number;
  spinning: boolean;
  onSettled: () => void;
}>) {
  const seg = 360 / segments.length;

  return (
    <div className="relative">
      {/* Pointer at the top, aimed into the wheel. */}
      <div
        aria-hidden
        className="-translate-x-1/2 absolute top-0 left-1/2 z-10"
        style={{
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "16px solid #18181b",
        }}
      />
      <svg viewBox="0 0 200 200" className="h-64 w-64" aria-hidden>
        <title>Roue</title>
        <g
          onTransitionEnd={onSettled}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "center",
            transition: spinning
              ? "transform 4s cubic-bezier(0.15, 0.6, 0.15, 1)"
              : "none",
          }}
        >
          {segments.map((s, i) => {
            const mid = i * seg + seg / 2;
            const [tx, ty] = polar(RADIUS * 0.62, mid);

            return (
              <g key={s.id}>
                <path
                  d={slicePath(i * seg, (i + 1) * seg)}
                  fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                  stroke="white"
                  strokeWidth={1}
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={segments.length > 6 ? 9 : 11}
                  fontWeight={600}
                  fill="white"
                >
                  {s.label.length > 10 ? `${s.label.slice(0, 9)}…` : s.label}
                </text>
              </g>
            );
          })}
        </g>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={10}
          fill="white"
          stroke="#18181b"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}
