"use client";

import { useState } from "react";

import { UploadIcon } from "@/components/icons";
import { emptyScenario } from "@/lib/catan/scenario-draft";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { freeName } from "@/lib/catan/scenario-transfer";
import type { ScenarioDraft } from "@/lib/hooks/use-extensions";
import { ScenarioImportSheet } from "./ScenarioImportSheet";

/**
 * The two ways a scenario comes into being: drawn here, or read back in from
 * somewhere else. They sit together because they answer to the same permission
 * — importing writes a scenario the app did not have, which is the same act as
 * creating one — and the whole bar is left out when the account lacks it.
 *
 * It says nothing itself. What just happened is reported where everything else
 * on this screen is reported, at the top of the section, so a screen never
 * grows a second place to look.
 */
export function ScenarioAuthoringBar({
  takenNames,
  onCreate,
  onSave,
  onImported,
  onError,
}: Readonly<{
  /** The names already in use, so an import lands beside them and not over one. */
  takenNames: string[];
  onCreate: (draft: ScenarioDraft) => void;
  onSave: (draft: ScenarioDraft) => Promise<void>;
  onImported: (name: string) => void;
  /** `null` clears what the last attempt left behind. */
  onError: (message: string | null) => void;
}>) {
  const [importing, setImporting] = useState(false);

  /**
   * A scenario read back in. It comes in under a free name, so importing the
   * same map twice makes a variant of it instead of a second one to tell apart.
   */
  async function importScenario(spec: ScenarioSpec) {
    onError(null);

    const name = freeName(spec.name, takenNames);

    try {
      await onSave({
        id: null,
        name,
        targetScore: spec.targetScore,
        boardSpec: { ...spec, name },
      });
      onImported(name);
    } catch {
      onError("Import impossible. Réessaie.");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            onCreate({
              id: null,
              name: "",
              targetScore: null,
              boardSpec: emptyScenario(),
            })
          }
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
        >
          + Créer un scénario
        </button>
        <button
          type="button"
          onClick={() => setImporting(true)}
          title="Coller un scénario copié ailleurs"
          className="flex items-center gap-2 rounded-lg border border-black/10 px-4 py-2 font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <UploadIcon />
          Importer
        </button>
      </div>

      {importing ? (
        <ScenarioImportSheet
          onImport={importScenario}
          onClose={() => setImporting(false)}
        />
      ) : null}
    </>
  );
}
