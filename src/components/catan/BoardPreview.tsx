"use client";

import { BoardWarnings } from "@/components/catan/BoardWarnings";
import { CatanBoardSvg } from "@/components/catan/CatanBoardSvg";
import { boardWarnings } from "@/lib/catan/board";
import type { GeneratorOptions } from "@/lib/catan/generator-options";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { useScenarioDraw } from "@/lib/hooks/use-scenario-draw";
import { useFogMaterial } from "./use-fog-material";

const panelClass = "flex flex-col gap-2 rounded-xl border p-3";

/**
 * A real draw of a scenario, for the player count on screen — the only way to
 * tell a map that adds up from a map that plays well. Redrawing shows how much
 * the scenario actually leaves to chance, and the settings it is drawn under
 * are the scenario's own, so changing one is answered here.
 *
 * `showWarnings` is for the author: what the placement rules had to give up on
 * is his to correct. A player leafing through the scenarios before a game is
 * looking at an illustration of one, and has nothing to do with the complaint.
 */
export function BoardPreview({
  spec,
  players,
  options,
  showWarnings = false,
}: Readonly<{
  spec: ScenarioSpec;
  players: number;
  options: GeneratorOptions;
  showWarnings?: boolean;
}>) {
  const { draw, regenerate } = useScenarioDraw(spec, players, options);
  const { fogButton, fogPanel } = useFogMaterial(
    draw.ok ? draw.drawn.spec : null,
    {
      buttonClass:
        "rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5",
      panelClass,
    },
  );

  if (!draw.ok) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {draw.reason}
      </p>
    );
  }

  const warnings = showWarnings
    ? boardWarnings(draw.drawn.board, draw.drawn.options)
    : [];

  return (
    <div className="flex flex-col gap-3">
      <CatanBoardSvg board={draw.drawn.board} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={regenerate}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          🎲 Régénérer
        </button>

        {fogButton}
      </div>

      {fogPanel}

      {warnings.length > 0 ? (
        <BoardWarnings warnings={warnings} className={panelClass} />
      ) : null}
    </div>
  );
}
