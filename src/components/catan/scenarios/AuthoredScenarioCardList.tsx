"use client";

import type { ExtensionScenario } from "@/lib/domain";
import { AuthoredScenarioCard } from "./AuthoredScenarioCard";

/** The scenarios of the Marins extension, in the order they are played in. */
export function AuthoredScenarioCardList({
  scenarios,
  onEdit,
  onDelete,
}: Readonly<{
  scenarios: ExtensionScenario[];
  onEdit: (scenario: ExtensionScenario) => void;
  onDelete: (scenario: ExtensionScenario) => void;
}>) {
  if (scenarios.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucun scénario pour l&apos;instant.
      </p>
    );
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
