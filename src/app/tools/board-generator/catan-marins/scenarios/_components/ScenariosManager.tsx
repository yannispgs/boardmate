"use client";

import { useState } from "react";

import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import {
  DEFAULT_TARGET_SCORE,
  emptyScenario,
} from "@/lib/catan/scenario-draft";
import type { ExtensionScenario } from "@/lib/domain";
import { MARINS_KEY } from "@/lib/game/scenario-editor";
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
