"use client";

import type { ExtensionScenario } from "@/lib/domain";
import { ScenarioCard } from "./ScenarioCard";

/** The scenarios of an extension, in their rulebook order. */
export function ScenarioCardList({
  scenarios,
}: {
  scenarios: ExtensionScenario[];
}) {
  if (scenarios.length === 0) {
    return <p className="text-sm text-zinc-500">Aucun scénario enregistré.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {scenarios.map(s => (
        <ScenarioCard key={s.id} scenario={s} />
      ))}
    </ul>
  );
}
