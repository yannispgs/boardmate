"use client";

import { useState } from "react";

import { sectionHeadingClass } from "@/components/ui";
import { useConfirm } from "@/components/use-confirm";
import {
  DEFAULT_TARGET_SCORE,
  emptyScenario,
} from "@/lib/catan/scenario-draft";
import type { Extension, ExtensionScenario } from "@/lib/domain";
import { type ScenarioDraft, useScenarios } from "@/lib/hooks/use-extensions";
import { ScenarioInUseError } from "@/lib/repositories/errors";
import { AuthoredScenarioCardList } from "./AuthoredScenarioCardList";
import { ScenarioEditor } from "./ScenarioEditor";

/**
 * The draft the editor opens on for an existing scenario. A scenario seeded
 * from the rulebook carries no map yet: it opens on an empty board — but under
 * its own name and score, which the editor saves back from the spec itself.
 */
function draftOf(scenario: ExtensionScenario): ScenarioDraft {
  const boardSpec = scenario.boardSpec ?? {
    ...emptyScenario(),
    name: scenario.name,
    targetScore: scenario.targetScore ?? DEFAULT_TARGET_SCORE,
  };

  return {
    id: scenario.id,
    name: boardSpec.name,
    targetScore: boardSpec.targetScore,
    boardSpec,
  };
}

/**
 * The scenarios authored for an extension, and the editor that writes to them.
 * Both live on the extension's own screen — leaving the editor is going back to
 * the list, so nothing is lost to a navigation and going back still leads where
 * the extension came from.
 */
export function ScenariosManager({
  extension,
  extensionKey,
}: Readonly<{ extension: Extension; extensionKey: string }>) {
  const { scenarios, loading, save, remove } = useScenarios(
    extensionKey,
    extension,
  );
  const [editing, setEditing] = useState<ScenarioDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { requestConfirm, confirmDialog } = useConfirm();

  async function deleteScenario(scenario: ExtensionScenario) {
    setError(null);
    try {
      await remove(scenario.id);
    } catch (e) {
      if (e instanceof ScenarioInUseError) {
        setError(
          `« ${scenario.name} » a déjà été joué : impossible de le supprimer.`,
        );
      } else {
        setError("Suppression impossible. Réessaie.");
      }
    }
  }

  function confirmDelete(scenario: ExtensionScenario) {
    requestConfirm({
      message: `Supprimer « ${scenario.name} » ? Cette action est définitive.`,
      confirmLabel: "Supprimer",
      onConfirm: () => deleteScenario(scenario),
    });
  }

  if (editing !== null) {
    return (
      <ScenarioEditor
        draft={editing}
        onSave={save}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className={sectionHeadingClass}>Scénarios · {scenarios.length}</h3>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : (
        <AuthoredScenarioCardList
          scenarios={scenarios}
          onEdit={scenario => setEditing(draftOf(scenario))}
          onDelete={confirmDelete}
        />
      )}

      <button
        type="button"
        onClick={() =>
          setEditing({
            id: null,
            name: "",
            targetScore: null,
            boardSpec: emptyScenario(),
          })
        }
        className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
      >
        + Créer un scénario
      </button>

      {confirmDialog}
    </section>
  );
}
