"use client";

import { useState } from "react";

import { type DeckNav, SwipeDeck } from "@/components/SwipeDeck";
import { boardWarnings } from "@/lib/catan/board";
import {
  type GeneratorOptions,
  scenarioOptions,
} from "@/lib/catan/generator-options";
import { marinsBoardIndex } from "@/lib/catan/marins";
import { setZoneIslands } from "@/lib/catan/scenario-draft";
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
import { ZoneIslandsCardList } from "./ZoneIslandsCardList";

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
 * the one before it was left. The island counts asked of a zone are held the
 * same way: they belong to the visit, and the scenario is never rewritten.
 */
export function MarinsScenarioBoard({
  spec: authored,
  players,
  browse = null,
}: Readonly<{
  spec: ScenarioSpec;
  players: number;
  /**
   * Flipping to the neighbouring scenario from the map itself. It is offered on
   * the map and nowhere else on the screen: everything under it is settings, and
   * a drag across a slider must stay a drag across a slider.
   */
  browse?: DeckNav | null;
}>) {
  const [showWarnings, setShowWarnings] = useState(false);
  // The scenario as this visit asks for it. Only the shape of the draw is
  // tunable here, and nothing goes back to the database: what is saved stays
  // the author's.
  const [spec, setSpec] = useState(authored);
  const [options, setOptions] = useState<GeneratorOptions>(() =>
    scenarioOptions(authored.options),
  );
  const { draw, regenerate } = useScenarioDraw(spec, players, options);
  const { fogButton, fogPanel } = useFogMaterial(
    draw.ok ? draw.drawn.spec : null,
    {
      buttonClass: fogButtonClass,
      panelClass: sectionClass,
    },
  );

  const boardIndex = marinsBoardIndex(spec, players);

  function change(patch: Partial<GeneratorOptions>) {
    setOptions(current => ({ ...current, ...patch }));
  }

  /** How many islands one zone of the board on screen should be cut into. */
  function cutInto(zone: number, islands: [number, number]) {
    setSpec(current => setZoneIslands(current, boardIndex, zone, islands));
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
      <SwipeDeck nav={browse} className="w-full max-w-md">
        <CatanBoardSvg board={board} />

        {warnings.length > 0 ? (
          <WarningsBadge onClick={() => setShowWarnings(v => !v)} />
        ) : null}
      </SwipeDeck>

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
        structure={
          <ZoneIslandsCardList
            spec={spec}
            board={boardIndex}
            onChange={cutInto}
          />
        }
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
                <span className="font-semibold text-red-600">8</span>. Une
                rivière d&apos;une zone face cachée ne paie rien tant
                qu&apos;elle n&apos;est pas retournée.
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
