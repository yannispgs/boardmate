"use client";

import { Modal } from "@/components/Modal";
import type { PlayerId } from "@/lib/domain";
import type { Standing } from "@/lib/game/stage-tally";

import { StandingCardList } from "./StandingCardList";

/**
 * The standings read out at the end of a manche, before anyone deals again.
 *
 * It is the whole point of counting manche by manche: what a manche cost is
 * only worth knowing next to the total it lands on, and the table wants to see
 * where it stands before it commits to another one. It is also where the game
 * announces its own end — the target reached is read off these very totals.
 */
export function StageRecap({
  stage,
  stageLabel,
  standings,
  players,
  target,
  stopped,
  disabled,
  onNext,
  onEnd,
}: Readonly<{
  stage: number;
  /** What the box calls a stage (« Manche »). */
  stageLabel: string;
  standings: readonly Standing[];
  players: ReadonlyArray<{ id: PlayerId; name: string }>;
  /** The total that stops the game, or null when nothing stops it. */
  target: number | null;
  /** Somebody has reached the target: this manche was the last one. */
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
        {stopped
          ? `La barre des ${target} points est franchie : la partie s'arrête ici.`
          : "Totaux après cette manche."}
      </p>

      <div className="mt-4">
        <StandingCardList
          standings={standings}
          players={players}
          showPoints
          target={target}
        />
      </div>

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
