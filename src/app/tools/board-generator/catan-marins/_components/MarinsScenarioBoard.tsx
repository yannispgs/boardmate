"use client";

import { useState } from "react";

import { BoardStructure } from "@/components/catan/BoardStructure";
import { BoardWarnings, WarningsBadge } from "@/components/catan/BoardWarnings";
import { CatanBoardSvg } from "@/components/catan/CatanBoardSvg";
import { TerrainLegend } from "@/components/catan/TerrainLegend";
import type { CatanTerrain } from "@/lib/catan/board";
import { boardWarnings } from "@/lib/catan/board";
import { boardTotals, type ScenarioSpec } from "@/lib/catan/scenario-spec";
import { useScenarioDraw } from "@/lib/hooks/use-scenario-draw";

/** Legend order — the terrains a scenario doesn't ship are filtered out. */
const TERRAIN_ORDER: CatanTerrain[] = [
  "forest",
  "pasture",
  "fields",
  "hills",
  "mountains",
  "gold",
  "desert",
];

const sectionClass =
  "flex w-full max-w-md flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10";

/**
 * One scenario drawn for one player count: the map, what the draw was allowed
 * to do with it, and the button that asks again. A scenario read from the
 * database can also refuse to be drawn — it is only checked for shape on the
 * way in — so the reason is shown in its place rather than a blank frame.
 */
export function MarinsScenarioBoard({
  spec,
  players,
}: Readonly<{
  spec: ScenarioSpec;
  players: number;
}>) {
  const [showWarnings, setShowWarnings] = useState(false);
  const { draw, regenerate } = useScenarioDraw(spec, players);

  if (!draw.ok) {
    return (
      <p role="alert" className={`${sectionClass} text-red-600 text-sm`}>
        {draw.reason}
      </p>
    );
  }

  const { board, options } = draw.drawn;
  const totals = boardTotals(draw.drawn.spec);
  const warnings = boardWarnings(board, options);

  return (
    <>
      <div className="relative w-full max-w-md">
        <CatanBoardSvg board={board} />

        {warnings.length > 0 ? (
          <WarningsBadge onClick={() => setShowWarnings(v => !v)} />
        ) : null}
      </div>

      {warnings.length > 0 && showWarnings ? (
        <BoardWarnings warnings={warnings} className={sectionClass} />
      ) : null}

      <button
        type="button"
        onClick={regenerate}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500"
      >
        🎲 Régénérer
      </button>

      <BoardStructure board={board} />

      <TerrainLegend
        terrains={TERRAIN_ORDER.filter(t => totals.terrainCounts[t] > 0)}
        sea
      />

      <section className={`${sectionClass} text-sm`}>
        <h2 className="font-semibold">Comment ce plateau est tiré</h2>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-zinc-600 dark:text-zinc-300">
          <li>
            Les cases fixes du scénario sont posées telles quelles ; le reste
            est tiré dans le sac de sa zone, {totals.land} tuiles de terre pour{" "}
            {board.sea.length} de mer.
          </li>
          <li>
            Les {board.ports.length} ports se répartissent sur les côtes, au
            plus un par tuile — sauf ceux que le scénario épingle lui-même.
          </li>
          <li>
            Terrains et nombres suivent les mêmes règles que le plateau de base
            : jamais deux 6/8 ni deux nombres identiques côte à côte, production
            équilibrée entre les ressources.
          </li>
          <li>
            Le score à atteindre est fixé par le scénario :{" "}
            <strong>{spec.targetScore} points</strong>.
          </li>
        </ul>
      </section>
    </>
  );
}
