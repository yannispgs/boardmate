"use client";

import { useState } from "react";

import { BoardStructure } from "@/components/catan/BoardStructure";
import { BoardWarnings, WarningsBadge } from "@/components/catan/BoardWarnings";
import { CatanBoardSvg } from "@/components/catan/CatanBoardSvg";
import { GeneratorSettings } from "@/components/catan/GeneratorSettings";
import { PlacementRules } from "@/components/catan/PlacementRules";
import { TerrainLegend } from "@/components/catan/TerrainLegend";
import type { CatanTerrain } from "@/lib/catan/board";
import { boardWarnings } from "@/lib/catan/board";
import {
  type GeneratorOptions,
  scenarioOptions,
} from "@/lib/catan/generator-options";
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
 * One scenario drawn for one player count: the map, the settings it was drawn
 * under, what the draw was allowed to do with it, and the button that asks
 * again. A scenario read from the database can also refuse to be drawn — it is
 * only checked for shape on the way in — so the reason is shown in its place
 * rather than a blank frame.
 *
 * The settings start from the ones the scenario's author saved, and go back to
 * them when another scenario is picked — the screen remounts this component per
 * scenario, so each one is drawn the way it was authored rather than the way
 * the one before it was left.
 */
export function MarinsScenarioBoard({
  spec,
  players,
}: Readonly<{
  spec: ScenarioSpec;
  players: number;
}>) {
  const [showWarnings, setShowWarnings] = useState(false);
  const [options, setOptions] = useState<GeneratorOptions>(() =>
    scenarioOptions(spec.options),
  );
  const { draw, regenerate } = useScenarioDraw(spec, players, options);

  function change(patch: Partial<GeneratorOptions>) {
    setOptions(current => ({ ...current, ...patch }));
  }

  if (!draw.ok) {
    return (
      <p role="alert" className={`${sectionClass} text-red-600 text-sm`}>
        {draw.reason}
      </p>
    );
  }

  const { board } = draw.drawn;
  const totals = boardTotals(draw.drawn.spec);
  const warnings = boardWarnings(board, draw.drawn.options);

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

      <GeneratorSettings options={options} onChange={change} deserts="none" />

      <PlacementRules
        title="Comment ce plateau est tiré"
        options={options}
        head={
          <>
            <li>
              Les cases fixes du scénario sont posées telles quelles ; le reste
              est tiré dans le sac de sa zone, {totals.land} tuiles de terre
              pour {board.sea.length} de mer.
            </li>
            <li>
              Les {board.ports.length} ports se répartissent sur les côtes, au
              plus un par tuile — sauf ceux que le scénario épingle lui-même.
            </li>
          </>
        }
        tail={
          <li>
            Le score à atteindre est fixé par le scénario :{" "}
            <strong>{spec.targetScore} points</strong>.
          </li>
        }
      />
    </>
  );
}
