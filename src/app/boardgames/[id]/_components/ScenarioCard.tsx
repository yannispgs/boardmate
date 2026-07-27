"use client";

import { ScenarioOriginBadge } from "@/components/catan/ScenarioOriginBadge";
import type { ExtensionScenario } from "@/lib/domain";

/**
 * One scenario of a scenario-based extension: its name and the score to reach,
 * which is fixed by the rules (never editable in the app).
 */
export function ScenarioCard({ scenario }: { scenario: ExtensionScenario }) {
  return (
    <li className="flex shrink-0 items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 truncate font-medium">{scenario.name}</span>
        <ScenarioOriginBadge isOfficial={scenario.isOfficial} />
      </div>
      {scenario.targetScore !== null ? (
        <span className="shrink-0 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
          🎯 {scenario.targetScore} pts
        </span>
      ) : null}
    </li>
  );
}
