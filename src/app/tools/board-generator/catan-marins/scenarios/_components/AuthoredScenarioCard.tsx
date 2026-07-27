"use client";

import { ScenarioOriginBadge } from "@/components/catan/ScenarioOriginBadge";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { dangerIconButtonClass, iconButtonClass } from "@/components/ui";
import { boardTotals } from "@/lib/catan/scenario-spec";
import type { ExtensionScenario } from "@/lib/domain";

/** What the scenario's maps add up to, in one line. */
function summary(scenario: ExtensionScenario): string {
  if (scenario.boardSpec === null) {
    return "Aucun plateau dessiné";
  }

  const boards = scenario.boardSpec.boards;
  const parts = boards.map(board => {
    const totals = boardTotals(board);

    return `${board.players.join("/")} j. : ${totals.land} terres, ${totals.sea} mers`;
  });

  return parts.join(" · ") || "Aucun plateau";
}

/**
 * One scenario: where it comes from, what it holds, the score it is played to,
 * and what can be done to it. A scenario with no map yet — one from the rulebook
 * waiting to be drawn — opens on an empty board like a new one; an official one
 * is editable all the same, but it belongs to the rules and is never deleted.
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
  return (
    <li className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-medium">{scenario.name}</span>
          <ScenarioOriginBadge isOfficial={scenario.isOfficial} />
        </div>
        <span className="text-xs text-zinc-500">{summary(scenario)}</span>
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
