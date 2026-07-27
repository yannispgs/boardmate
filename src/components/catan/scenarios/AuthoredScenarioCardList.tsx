"use client";

import type { ExtensionScenario } from "@/lib/domain";
import { AuthoredScenarioCard } from "./AuthoredScenarioCard";

/** The scenarios of the Marins extension, in the order they are played in. */
export function AuthoredScenarioCardList({
  scenarios,
  onEdit,
  onDelete,
  empty = "Aucun scénario pour l'instant.",
}: Readonly<{
  scenarios: ExtensionScenario[];
  onEdit: (scenario: ExtensionScenario) => void;
  onDelete: (scenario: ExtensionScenario) => void;
  /** What to say when there is nothing to list — a filter narrows it. */
  empty?: string;
}>) {
  if (scenarios.length === 0) {
    return <p className="text-sm text-zinc-500">{empty}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {scenarios.map(scenario => (
        <AuthoredScenarioCard
          key={scenario.id}
          scenario={scenario}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
