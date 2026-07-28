"use client";

import { useState } from "react";

import { boardWarnings } from "@/lib/catan/board";
import {
  type GeneratorOptions,
  scenarioOptions,
} from "@/lib/catan/generator-options";
import { boardTotals, type ScenarioSpec } from "@/lib/catan/scenario-spec";
import { useScenarioDraw } from "@/lib/hooks/use-scenario-draw";
import { BoardStructure } from "./BoardStructure";
import { BoardWarnings, WarningsBadge } from "./BoardWarnings";
import { CatanBoardSvg } from "./CatanBoardSvg";
import { GeneratorSettings } from "./GeneratorSettings";
import { PlacementRules } from "./PlacementRules";
import { TerrainLegend } from "./TerrainLegend";
import { TERRAIN_ORDER } from "./terrain-labels";
import { useFogMaterial } from "./use-fog-material";

const sectionClass =
  "flex w-full max-w-md flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10";

const fogButtonClass =
  "rounded-lg border border-black/10 px-5 py-2.5 font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10";

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
  const { fogButton, fogPanel } = useFogMaterial(
    draw.ok ? draw.drawn.spec : null,
    {
      buttonClass: fogButtonClass,
      panelClass: sectionClass,
    },
  );

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

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={regenerate}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500"
        >
          🎲 Régénérer
        </button>

        {fogButton}
      </div>

      {fogPanel}

      <BoardStructure board={board} />

      <TerrainLegend
        terrains={TERRAIN_ORDER.filter(t => totals.terrainCounts[t] > 0)}
        sea
      />

      <GeneratorSettings
        options={options}
        onChange={change}
        deserts="none"
        goldRivers
      />

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
              Les {board.ports.length} ports se répartissent le long des côtes —
              sauf ceux que le scénario épingle lui-même.
            </li>
            {options.avoidGoldReds ? (
              <li>
                Aucune rivière d&apos;or visible ne porte un{" "}
                <span className="font-semibold text-red-600">6</span> ni un{" "}
                <span className="font-semibold text-red-600">8</span> (celles
                d&apos;une zone face cachée ne paient rien tant qu&apos;elles ne
                sont pas retournées).
              </li>
            ) : null}
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
