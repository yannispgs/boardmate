"use client";

import { Modal } from "@/components/Modal";
import { useWheelSpin, WheelSvg } from "@/components/WheelSvg";
import type { Player } from "@/lib/domain";
import { rotateToFirst } from "@/lib/game/first-player-wheel";

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
}: Readonly<{
  players: Player[];
  onResult: (ordered: Player[]) => void;
  onClose: () => void;
}>) {
  const { rotation, spinning, settledIndex, spin, handleSettled } =
    useWheelSpin(players.length);

  const winner = settledIndex !== null ? players[settledIndex] : null;

  return (
    <Modal
      onClose={onClose}
      dismissable={!spinning}
      label="Roue du premier joueur"
      className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-center text-lg font-semibold">Qui commence&nbsp;?</h2>

      <WheelSvg
        segments={players.map(p => ({ id: p.id, label: p.name }))}
        rotation={rotation}
        spinning={spinning}
        onSettled={handleSettled}
      />

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
