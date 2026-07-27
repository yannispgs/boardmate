"use client";

import { ScenarioOriginBadge } from "@/components/catan/ScenarioOriginBadge";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { dangerIconButtonClass, iconButtonClass } from "@/components/ui";
import { scenarioSummary } from "@/lib/catan/scenario-listing";
import { validateScenarioSpec } from "@/lib/catan/scenario-spec";
import type { ExtensionScenario } from "@/lib/domain";

/**
 * One scenario: where it comes from, what it holds, the score it is played to,
 * and what can be done to it. A scenario with no map yet — one from the rulebook
 * waiting to be drawn — opens on an empty board like a new one; an official one
 * is editable all the same, but it belongs to the rules and is never deleted.
 *
 * A map whose bags do not add up is called out here rather than only inside the
 * editor: the generator draws it all the same, but not as it was meant to be.
 */
export function AuthoredScenarioCard({
  scenario,
  onEdit,
  onDelete,
}: Readonly<{
  scenario: ExtensionScenario;
  onEdit: (scenario: ExtensionScenario) => void;
  onDelete: (scenario: ExtensionScenario) => void;
}>) {
  const unfinished =
    scenario.boardSpec !== null &&
    validateScenarioSpec(scenario.boardSpec).length > 0;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-medium">{scenario.name}</span>
          <ScenarioOriginBadge isOfficial={scenario.isOfficial} />
          {unfinished ? (
            <span
              title="Ce scénario ne tombe pas juste : ouvre-le pour voir ce qui manque"
              className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
            >
              À corriger
            </span>
          ) : null}
        </div>
        <span className="text-xs text-zinc-500">
          {scenario.boardSpec === null
            ? "Aucun plateau dessiné"
            : scenarioSummary(scenario.boardSpec)}
        </span>
      </div>

      {scenario.targetScore === null ? null : (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-500">
          🎯 {scenario.targetScore}
        </span>
      )}

      <button
        type="button"
        onClick={() => onEdit(scenario)}
        aria-label={`Modifier ${scenario.name}`}
        title="Modifier"
        className={iconButtonClass}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={() => onDelete(scenario)}
        disabled={scenario.isOfficial}
        aria-label={`Supprimer ${scenario.name}`}
        title={
          scenario.isOfficial
            ? "Un scénario officiel ne se supprime pas"
            : "Supprimer"
        }
        className={`${dangerIconButtonClass} disabled:cursor-not-allowed disabled:opacity-30`}
      >
        <TrashIcon />
      </button>
    </li>
  );
}
