"use client";

import { Modal } from "@/components/Modal";
import type { GamePlayer, Player, PlayerId } from "@/lib/domain";
import { LiveScore } from "./LiveScore";

/**
 * The live-scoring entry point on the play screen. A floating button pinned to
 * the side of the screen (next to the timer) opens a modal to update scores —
 * so the score sheet is one tap away without scrolling — and shows the current
 * top score against the objective at a glance. Fully controlled: the running
 * totals live in the parent (the play screen) so they survive the modal closing
 * and feed the end-of-game screen.
 */
export function ScorePanel({
  players,
  scores,
  threshold,
  allowNegative,
  onSet,
  disabled,
  open,
  onOpenChange,
}: {
  players: Array<GamePlayer & { player: Player }>;
  scores: Record<string, number>;
  threshold: number | null;
  allowNegative: boolean;
  onSet: (playerId: PlayerId, score: number) => void;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const topScore = players.reduce(
    (max, p) => Math.max(max, scores[p.playerId] ?? 0),
    0,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Ouvrir les scores"
        className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-indigo-600 p-3 text-white shadow-lg transition hover:bg-indigo-500"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <title>Scores</title>
          {/* Podium (ranking): 2nd · 1st · 3rd, tallest in the middle. */}
          <rect x="3" y="12" width="6" height="8" rx="1" />
          <rect x="9" y="7" width="6" height="13" rx="1" />
          <rect x="15" y="15" width="6" height="5" rx="1" />
        </svg>
        <span className="text-xs font-semibold tabular-nums leading-none">
          {threshold !== null ? `${topScore}/${threshold}` : topScore}
        </span>
      </button>

      {open ? (
        <Modal
          onClose={() => onOpenChange(false)}
          label="Scores"
          className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Mettre à jour les scores
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Fermer"
              className="rounded-lg border border-black/10 px-3 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Fermer
            </button>
          </div>

          <LiveScore
            players={players}
            scores={scores}
            threshold={threshold}
            allowNegative={allowNegative}
            onSet={onSet}
            disabled={disabled}
          />
        </Modal>
      ) : null}
    </>
  );
}
