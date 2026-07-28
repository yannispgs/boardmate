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
 *
 * Choosing it is the carousel's own button, kept in reach at the bottom of the
 * modal rather than scrolled past with the map.
 */
export function ScenarioSlide({
  scenario,
  players,
}: Readonly<{
  scenario: ExtensionScenario;
  players: number;
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
    </div>
  );
}
