"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BoardStructure } from "@/components/catan/BoardStructure";
import { BoardWarnings, WarningsBadge } from "@/components/catan/BoardWarnings";
import { CatanBoardSvg } from "@/components/catan/CatanBoardSvg";
import {
  type SegmentedOption,
  SegmentedPicker,
} from "@/components/catan/SegmentedPicker";
import { TerrainLegend } from "@/components/catan/TerrainLegend";
import { PencilIcon } from "@/components/icons";
import { iconButtonClass } from "@/components/ui";
import { boardWarnings, type CatanTerrain } from "@/lib/catan/board";
import {
  generateMarinsBoard,
  MARINS_SCENARIOS,
  type MarinsBoard,
  type MarinsScenarioKey,
  marinsPlayerGroups,
  marinsScenario,
  playerGroupLabel,
} from "@/lib/catan/marins";
import { boardTotals } from "@/lib/catan/scenario-spec";
import { MARINS_SCENARIOS_HREF } from "@/lib/game/scenario-editor";

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

const SCENARIOS: SegmentedOption<MarinsScenarioKey>[] = MARINS_SCENARIOS.map(
  s => ({
    value: s.key,
    label: s.spec.name,
    hint: `🎯 ${s.spec.targetScore} points`,
  }),
);

const FIRST = MARINS_SCENARIOS[0];
const DEFAULT_PLAYERS = marinsPlayerGroups(FIRST.spec)[0][0];

const sectionClass =
  "flex w-full max-w-md flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10";

/**
 * Interactive **Catan - Marins** board generator: a scenario picker, the player
 * counts that scenario has a map for, the drawn islands, and a "Nouveau
 * plateau" button. The first render is deterministic (so server and client
 * markup match), then a fresh random map is drawn on mount.
 */
export function MarinsBoardGenerator() {
  const [showWarnings, setShowWarnings] = useState(false);
  const [drawn, setDrawn] = useState<MarinsBoard>(() =>
    generateMarinsBoard(FIRST.key, DEFAULT_PLAYERS, 1),
  );

  useEffect(() => {
    setDrawn(generateMarinsBoard(FIRST.key, DEFAULT_PLAYERS));
  }, []);

  const { scenario, players, spec, board, options } = drawn;
  const totals = boardTotals(spec);
  const groups = marinsPlayerGroups(scenario.spec);
  const warnings = boardWarnings(board, options);

  function regen(key: MarinsScenarioKey, count: number) {
    setDrawn(generateMarinsBoard(key, count));
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <SegmentedPicker
        label="Scénario"
        options={SCENARIOS}
        value={scenario.key}
        onChange={key =>
          regen(key, marinsPlayerGroups(marinsScenario(key).spec)[0][0])
        }
        action={
          <Link
            href={MARINS_SCENARIOS_HREF}
            title="Gérer les scénarios"
            className={iconButtonClass}
          >
            <PencilIcon />
          </Link>
        }
      />

      {groups.length > 1 ? (
        <SegmentedPicker
          label="Nombre de joueurs"
          options={groups.map(group => ({
            value: group[0],
            label: playerGroupLabel(group),
          }))}
          value={groups.find(g => g.includes(players))?.[0] ?? players}
          onChange={count => regen(scenario.key, count)}
        />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {playerGroupLabel(groups[0])} · {totals.land} terres,{" "}
          {board.sea.length} mers, {board.ports.length} ports · 🎯{" "}
          {scenario.spec.targetScore} points
        </p>
      )}

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
        onClick={() => regen(scenario.key, players)}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500"
      >
        🎲 Nouveau plateau
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
            Les {totals.land} tuiles de terre forment des îles séparées par la
            mer, posées à distance les unes des autres.
          </li>
          <li>
            Les {board.ports.length} ports se répartissent sur les côtes, au
            plus un par tuile.
          </li>
          <li>
            Terrains et nombres suivent les mêmes règles que le plateau de base
            : jamais deux 6/8 ni deux nombres identiques côte à côte, production
            équilibrée entre les ressources.
          </li>
          <li>
            Le score à atteindre est fixé par le scénario :{" "}
            <strong>{scenario.spec.targetScore} points</strong>.
          </li>
        </ul>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          « Le Nouveau Monde » n&apos;a pas de carte imprimée — les joueurs
          composent la leur. Les scénarios à carte fixe (Les quatre îles, À la
          découverte de nouveaux rivages…) arriveront quand leur plan
          d&apos;îles sera saisi.
        </p>
      </section>
    </div>
  );
}
