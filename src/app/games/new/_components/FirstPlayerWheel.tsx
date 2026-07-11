"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import type { Player } from "@/lib/domain";
import {
  nextRotation,
  pickWinnerIndex,
  rotateToFirst,
} from "@/lib/game/first-player-wheel";

/** Segment fills, cycled across the players (enough distinct hues for a table). */
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

/**
 * A spinning wheel that elects the first player. Each player gets an equal
 * segment; a press launches a decelerating spin that lands the top pointer on a
 * crypto-random winner. Confirming rotates the turn order so the winner leads.
 * Honours `prefers-reduced-motion` (the wheel jumps straight to the result).
 */
export function FirstPlayerWheel({
  players,
  onResult,
  onClose,
}: {
  players: Player[];
  onResult: (ordered: Player[]) => void;
  onClose: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  // Only set once the spin settles — gates the result banner / confirm button.
  const [settledIndex, setSettledIndex] = useState<number | null>(null);

  const seg = 360 / players.length;

  function spin() {
    if (spinning) {
      return;
    }

    const index = pickWinnerIndex(players.length);
    setWinnerIndex(index);
    setSettledIndex(null);
    setRotation(prev => nextRotation(prev, players.length, index));

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

  const winner = settledIndex !== null ? players[settledIndex] : null;

  return (
    <Modal
      onClose={onClose}
      dismissable={!spinning}
      label="Roue du premier joueur"
      className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-center text-lg font-semibold">Qui commence&nbsp;?</h2>

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
          <title>Roue du premier joueur</title>
          <g
            onTransitionEnd={handleSettled}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center",
              transition: spinning
                ? "transform 4s cubic-bezier(0.15, 0.6, 0.15, 1)"
                : "none",
            }}
          >
            {players.map((p, i) => {
              const mid = i * seg + seg / 2;
              const [tx, ty] = polar(RADIUS * 0.62, mid);
              return (
                <g key={p.id}>
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
                    fontSize={players.length > 6 ? 9 : 11}
                    fontWeight={600}
                    fill="white"
                  >
                    {p.name.length > 10 ? `${p.name.slice(0, 9)}…` : p.name}
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

      {winner ? (
        <p className="text-center text-base" aria-live="polite">
          🎉 <span className="font-semibold">{winner.name}</span>{" "}
          commence&nbsp;!
        </p>
      ) : (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {spinning ? "La roue tourne…" : "Lance la roue pour tirer au sort."}
        </p>
      )}

      <div className="flex w-full gap-2">
        {winner ? (
          <>
            <button
              type="button"
              onClick={() =>
                onResult(rotateToFirst(players, settledIndex ?? 0))
              }
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
            >
              {winner.name} commence
            </button>
            <button
              type="button"
              onClick={spin}
              className="rounded-lg border border-black/10 px-4 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Relancer
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={spin}
              disabled={spinning}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              Tourner la roue
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={spinning}
              className="rounded-lg border border-black/10 px-4 py-2 transition hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5"
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
