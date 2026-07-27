"use client";

import { BoardWarnings } from "@/components/catan/BoardWarnings";
import { CatanBoardSvg } from "@/components/catan/CatanBoardSvg";
import { boardWarnings } from "@/lib/catan/board";
import type { GeneratorOptions } from "@/lib/catan/generator-options";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { useScenarioDraw } from "@/lib/hooks/use-scenario-draw";

/**
 * A real draw of the scenario being authored, for the player count on screen —
 * the only way to tell a map that adds up from a map that plays well. Redrawing
 * shows how much the scenario actually leaves to chance, and the settings it is
 * drawn under are the scenario's own, so changing one is answered here.
 */
export function BoardPreview({
  spec,
  players,
  options,
}: Readonly<{
  spec: ScenarioSpec;
  players: number;
  options: GeneratorOptions;
}>) {
  const { draw, regenerate } = useScenarioDraw(spec, players, options);

  if (!draw.ok) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {draw.reason}
      </p>
    );
  }

  const warnings = boardWarnings(draw.drawn.board, draw.drawn.options);

  return (
    <div className="flex flex-col gap-3">
      <CatanBoardSvg board={draw.drawn.board} />

      <button
        type="button"
        onClick={regenerate}
        className="self-start rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
      >
        🎲 Régénérer
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
