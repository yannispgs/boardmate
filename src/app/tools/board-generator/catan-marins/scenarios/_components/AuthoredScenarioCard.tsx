"use client";

import { PencilIcon, TrashIcon } from "@/components/icons";
import { dangerIconButtonClass, iconButtonClass } from "@/components/ui";
import { boardTotals } from "@/lib/catan/scenario-spec";
import type { ExtensionScenario } from "@/lib/domain";

/** What the scenario's maps add up to, in one line. */
function summary(scenario: ExtensionScenario): string {
  if (scenario.boardSpec === null) {
    return "Plateau intégré à l'application";
  }

  const boards = scenario.boardSpec.boards;
  const parts = boards.map(board => {
    const totals = boardTotals(board);

    return `${board.players.join("/")} j. : ${totals.land} terres, ${totals.sea} mers`;
  });

  return parts.join(" · ") || "Aucun plateau";
}

/**
 * One authored scenario: what it holds, the score it is played to, and the two
 * things that can be done to it. A scenario shipped in code has no map of its
 * own in the database, so it can only be read.
 */
export function AuthoredScenarioCard({
  scenario,
  onEdit,
  onDelete,
}: {
  scenario: ExtensionScenario;
  onEdit: (scenario: ExtensionScenario) => void;
  onDelete: (scenario: ExtensionScenario) => void;
}) {
  const editable = scenario.boardSpec !== null;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{scenario.name}</span>
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
        disabled={!editable}
        aria-label={`Modifier ${scenario.name}`}
        title={editable ? "Modifier" : "Scénario intégré à l'application"}
        className={`${iconButtonClass} disabled:opacity-30`}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={() => onDelete(scenario)}
        disabled={!editable}
        aria-label={`Supprimer ${scenario.name}`}
        title="Supprimer"
        className={`${dangerIconButtonClass} disabled:opacity-30`}
      >
        <TrashIcon />
      </button>
    </li>
  );
}
