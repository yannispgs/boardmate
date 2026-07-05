"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import type { PlayerId } from "@/lib/domain";

/**
 * Shown when a live threshold game reaches (or overshoots) its target. The
 * winner is pre-selected as the top scorer, but the objective can be reached or
 * exceeded by several players at once, so the winner is confirmable/overridable
 * before ending. "Continuer la partie" dismisses (e.g. a mis-tap or a score
 * correction).
 */
export function LiveEndPrompt({
  players,
  scores,
  defaultWinnerId,
  onEnd,
  onCancel,
  disabled,
}: {
  players: { id: PlayerId; name: string }[];
  scores: Record<string, number>;
  defaultWinnerId: PlayerId | null;
  onEnd: (winnerId: PlayerId) => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [winnerId, setWinnerId] = useState<PlayerId | null>(defaultWinnerId);

  return (
    <Modal
      onClose={onCancel}
      label="Fin de partie"
      className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-base font-semibold">Fin de partie ?</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        L&apos;objectif est atteint. Confirme le gagnant.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {players.map(p => {
          const isWinner = winnerId === p.id;

          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setWinnerId(p.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  isWinner
                    ? "border-amber-500 bg-amber-500/10 font-semibold"
                    : "border-black/10 hover:border-indigo-400 dark:border-white/10"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">
                  {isWinner ? "🏆 " : ""}
                  {p.name}
                </span>
                <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                  {scores[p.id] ?? 0} pts
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Continuer la partie
        </button>
        <button
          type="button"
          disabled={disabled || winnerId === null}
          onClick={() => {
            if (winnerId !== null) {
              onEnd(winnerId);
            }
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Terminer
        </button>
      </div>
    </Modal>
  );
}
