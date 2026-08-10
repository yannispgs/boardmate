"use client";

import type { ExtensionScenario } from "@/lib/domain";
import { ScenarioCard } from "./ScenarioCard";

/** The scenarios of an extension, in their rulebook order. */
export function ScenarioCardList({
  scenarios,
}: Readonly<{
  scenarios: ExtensionScenario[];
}>) {
  if (scenarios.length === 0) {
    return <p className="text-sm text-zinc-500">Aucun scénario enregistré.</p>;
  }

  return (
    // Three scenarios tall, then it scrolls: an extension can ship a dozen of
    // them, and what the extension changes has to stay visible above the fold.
    // The fourth card peeks out just enough to say there is more below.
    <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
      {scenarios.map(s => (
        <ScenarioCard key={s.id} scenario={s} />
      ))}
    </ul>
  );
}
