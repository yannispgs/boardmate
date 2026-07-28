"use client";

import { useMemo } from "react";

import { BoardPreview } from "@/components/catan/BoardPreview";
import { ScenarioOriginBadge } from "@/components/catan/ScenarioOriginBadge";
import { scenarioOptions } from "@/lib/catan/generator-options";
import type { ExtensionScenario } from "@/lib/domain";

/**
 * One scenario as it is offered before a game: what it is called, what it asks
 * you to score, and a board drawn from it for the players already seated. The
 * board is an illustration — the one played is drawn in the generator — so what
 * matters here is the shape of the map, not this particular hand of it.
 */
export function ScenarioSlide({
  scenario,
  players,
  selected,
  onChoose,
}: Readonly<{
  scenario: ExtensionScenario;
  players: number;
  selected: boolean;
  onChoose: () => void;
}>) {
  const spec = scenario.boardSpec;
  const options = useMemo(() => scenarioOptions(spec?.options), [spec]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{scenario.name}</h3>
        <ScenarioOriginBadge isOfficial={scenario.isOfficial} />
        {scenario.targetScore !== null ? (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            🎯 {scenario.targetScore} points
          </span>
        ) : null}
      </div>

      {spec === null ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucun plateau dessiné pour ce scénario.
        </p>
      ) : (
        <BoardPreview spec={spec} players={players} options={options} />
      )}

      <button
        type="button"
        onClick={onChoose}
        className={`rounded-lg px-4 py-2 font-medium transition ${
          selected
            ? "border border-indigo-500/40 text-indigo-600 dark:text-indigo-400"
            : "bg-indigo-600 text-white hover:bg-indigo-500"
        }`}
      >
        {selected ? "✓ Scénario choisi" : "Choisir ce scénario"}
      </button>
    </div>
  );
}
