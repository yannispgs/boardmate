"use client";

import type { ReactNode } from "react";

import { Modal } from "@/components/Modal";

/**
 * The standings read out at the end of a manche, before anyone deals again.
 *
 * It is the whole point of counting manche by manche: what a manche cost is
 * only worth knowing next to the total it lands on, and the table wants to see
 * where it stands before it commits to another one. It is also where the game
 * announces its own end — the target reached, or the last phase cleared, is
 * read off these very standings.
 */
export function StageRecap({
  stage,
  stageLabel,
  board,
  stopNote,
  stopped,
  disabled,
  onNext,
  onEnd,
}: Readonly<{
  stage: number;
  /** What the box calls a stage (« Manche »). */
  stageLabel: string;
  /** The standings after this manche, with what it cost each player. */
  board: ReactNode;
  /** Why the game stops here, read out when it does. */
  stopNote: string;
  /** This manche was the last one. */
  stopped: boolean;
  disabled: boolean;
  onNext: () => void;
  onEnd: () => void;
}>) {
  const unit = stageLabel.toLowerCase();

  return (
    <Modal
      onClose={stopped ? onEnd : onNext}
      dismissable={false}
      label={`Fin de la ${unit} ${stage}`}
      className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-base font-semibold">
        Fin de la {unit} {stage}
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {stopped ? stopNote : "Totaux après cette manche."}
      </p>

      <div className="mt-4">{board}</div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={stopped ? onEnd : onNext}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {stopped ? "Voir le classement" : `${stageLabel} ${stage + 1}`}
        </button>
      </div>
    </Modal>
  );
}
