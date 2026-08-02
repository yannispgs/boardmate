"use client";

import { CatanBoardGenerator } from "@/components/catan/CatanBoardGenerator";
import { MarinsScenarioBoard } from "@/components/catan/MarinsScenarioBoard";
import { ErrorText } from "@/components/ErrorText";
import type { FunnelBoard } from "@/lib/game/funnel-board";
import { FunnelStep } from "./FunnelStep";

/**
 * The board this game is about to be set up on, drawn right before it starts:
 * the same generator the tools offer, minus everything the funnel already
 * knows — the size comes from the seats, the map from the chosen scenario. The
 * board is only played on, never stored: what is kept of a game is what was
 * done on it, not the hexes it was laid out with.
 */
export function BoardStep({
  board,
  creating,
  error,
  onBack,
  onValidate,
}: Readonly<{
  board: FunnelBoard;
  creating: boolean;
  error: string | null;
  onBack: () => void;
  onValidate: () => void;
}>) {
  return (
    <FunnelStep
      title="5 · Monte le plateau"
      onBack={onBack}
      footer={
        <>
          <ErrorText message={error} />

          <button
            type="button"
            disabled={creating}
            onClick={onValidate}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {creating ? "Création…" : "Valider ce plateau"}
          </button>
        </>
      }
    >
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Régénère jusqu&apos;à tomber sur le plateau que vous avez envie de
        jouer, puis monte-le avant de lancer la partie.
      </p>

      <div className="flex flex-col items-center gap-6">
        {board.kind === "base" ? (
          <CatanBoardGenerator size={board.size} />
        ) : (
          <MarinsScenarioBoard spec={board.spec} players={board.players} />
        )}
      </div>
    </FunnelStep>
  );
}
