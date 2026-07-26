"use client";

import { useState } from "react";

import { BoardWarnings } from "@/components/catan/BoardWarnings";
import { CatanBoardSvg } from "@/components/catan/CatanBoardSvg";
import { boardWarnings } from "@/lib/catan/board";
import { generateSpecBoard } from "@/lib/catan/marins";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";

/**
 * A real draw of the scenario being authored, for the player count on screen —
 * the only way to tell a map that adds up from a map that plays well. Redrawing
 * shows how much the scenario actually leaves to chance.
 */
export function BoardPreview({
  spec,
  players,
}: {
  spec: ScenarioSpec;
  players: number;
}) {
  const [seed, setSeed] = useState(1);

  let drawn: ReturnType<typeof generateSpecBoard> | null = null;
  let failure: string | null = null;

  try {
    drawn = generateSpecBoard(spec, players, seed);
  } catch (error) {
    failure = error instanceof Error ? error.message : "Tirage impossible.";
  }

  if (drawn === null) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {failure}
      </p>
    );
  }

  const warnings = boardWarnings(drawn.board, drawn.options);

  return (
    <div className="flex flex-col gap-3">
      <CatanBoardSvg board={drawn.board} />

      <button
        type="button"
        onClick={() => setSeed(s => s + 1)}
        className="self-start rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
      >
        🎲 Retirer
      </button>

      {warnings.length > 0 ? (
        <BoardWarnings
          warnings={warnings}
          className="flex flex-col gap-2 rounded-xl border p-3"
        />
      ) : null}
    </div>
  );
}
