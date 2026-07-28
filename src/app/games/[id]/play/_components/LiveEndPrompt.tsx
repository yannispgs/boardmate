"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import type { PlayerId, TieBreakRecord } from "@/lib/domain";

/**
 * Shown when a live threshold game reaches (or overshoots) its target. The
 * winner is pre-selected from the scores — several of them when the table ended
 * level and the game's own rule (Catan: whoever holds the turn) didn't separate
 * them. The objective can be reached or exceeded by several players at once, so
 * the selection stays confirmable and modifiable: tapping a name adds or removes
 * a winner. "Continuer la partie" dismisses (e.g. a mis-tap or a correction).
 */
export function LiveEndPrompt({
  players,
  scores,
  defaultWinnerIds,
  tieBreak,
  onEnd,
  onCancel,
  disabled,
}: Readonly<{
  players: { id: PlayerId; name: string }[];
  scores: Record<string, number>;
  defaultWinnerIds: PlayerId[];
  /** What settled the tie, when the game ended level. Null otherwise. */
  tieBreak: TieBreakRecord | null;
  onEnd: (winnerIds: PlayerId[]) => void;
  onCancel: () => void;
  disabled: boolean;
}>) {
  const [winnerIds, setWinnerIds] = useState<PlayerId[]>(defaultWinnerIds);

  const toggle = (id: PlayerId) => {
    setWinnerIds(ids =>
      ids.includes(id) ? ids.filter(w => w !== id) : [...ids, id],
    );
  };
  const appliedRule = tieBreak?.steps.at(-1)?.label ?? null;

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

      {tieBreak?.shared ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Égalité qu&apos;aucune règle ne départage : victoire partagée.
        </p>
      ) : null}
      {appliedRule && !tieBreak?.shared ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Égalité départagée : {appliedRule.toLowerCase()}.
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-2">
        {players.map(p => {
          const isWinner = winnerIds.includes(p.id);

          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => toggle(p.id)}
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
          disabled={disabled || winnerIds.length === 0}
          onClick={() => onEnd(winnerIds)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Terminer
        </button>
      </div>
    </Modal>
  );
}
