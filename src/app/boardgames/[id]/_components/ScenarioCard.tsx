"use client";

import type { ExtensionScenario } from "@/lib/domain";

/**
 * One scenario of a scenario-based extension: its name and the score to reach,
 * which is fixed by the rules (never editable in the app).
 */
export function ScenarioCard({ scenario }: { scenario: ExtensionScenario }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{scenario.name}</span>
        <span className="text-xs text-zinc-500">
          {scenario.boardKey !== null ? "Plateau dédié" : "Plateau de base"}
        </span>
      </div>
      {scenario.targetScore !== null ? (
        <span className="shrink-0 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
          🎯 {scenario.targetScore} pts
        </span>
      ) : null}
    </li>
  );
}
