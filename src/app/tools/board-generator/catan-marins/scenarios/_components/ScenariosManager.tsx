"use client";

import { useState } from "react";

import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import { emptyScenario } from "@/lib/catan/scenario-draft";
import type { ExtensionScenario } from "@/lib/domain";
import { type ScenarioDraft, useScenarios } from "@/lib/hooks/use-extensions";
import { ScenarioInUseError } from "@/lib/repositories/errors";
import { AuthoredScenarioCardList } from "./AuthoredScenarioCardList";
import { ScenarioEditor } from "./ScenarioEditor";

/** The key the Marins extension is found by, whatever its name becomes. */
const MARINS_KEY = "catan-marins";

/** The draft the editor opens on for an existing scenario. */
function draftOf(scenario: ExtensionScenario): ScenarioDraft {
  return {
    id: scenario.id,
    name: scenario.name,
    targetScore: scenario.targetScore,
    // Only scenarios with a map of their own can be opened; the fallback is
    // there for the type, not for a case the list allows.
    boardSpec: scenario.boardSpec ?? emptyScenario(),
  };
}

/**
 * The scenarios authored for Catan - Marins: the list, and the editor that
 * writes to it. Both live on the same screen — leaving the editor is going back
 * to the list, so nothing is lost to a navigation.
 */
export function ScenariosManager() {
  const { scenarios, loading, save, remove } = useScenarios(MARINS_KEY);
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
    <div className="flex flex-1 flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 pb-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Chargement…</p>
        ) : (
          <AuthoredScenarioCardList
            scenarios={scenarios}
            onEdit={scenario => setEditing(draftOf(scenario))}
            onDelete={confirmDelete}
          />
        )}
      </div>

      <StickyActionBar>
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
      </StickyActionBar>

      {confirmDialog}
    </div>
  );
}
