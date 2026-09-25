"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { sectionHeadingClass } from "@/components/ui";
import { useConfirm } from "@/components/use-confirm";
import {
  DEFAULT_TARGET_SCORE,
  emptyScenario,
  pruneStrandedPorts,
  stripFixedSea,
} from "@/lib/catan/scenario-draft";
import {
  drawnSpecsOf,
  type PlayerFilter,
  scenariosMatching,
} from "@/lib/catan/scenario-listing";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { serialiseScenario } from "@/lib/catan/scenario-transfer";
import type { Extension, ExtensionScenario } from "@/lib/domain";
import { type ScenarioDraft, useScenarios } from "@/lib/hooks/use-extensions";
import { useMyPermissions } from "@/lib/hooks/use-my-permissions";
import { ScenarioInUseError } from "@/lib/repositories/errors";
import { ScenarioAuthoringBar } from "./ScenarioAuthoringBar";
import { ScenarioEditor } from "./ScenarioEditor";
import { ScenarioListPanel } from "./ScenarioListPanel";

/**
 * The draft the editor opens on for an existing scenario. A scenario seeded
 * from the rulebook carries no map yet: it opens on an empty board — but under
 * its own name and score, which the editor saves back from the spec itself.
 *
 * A map drawn before the ends of the middle row were fixed to the open sea may
 * still paint over them; it is lifted off on the way in, since the author can no
 * longer reach those spaces to do it himself. So are the harbours left inland by
 * a map painted over in a version that did not take them off.
 */
function draftOf(scenario: ExtensionScenario): ScenarioDraft {
  const boardSpec = pruneStrandedPorts(
    stripFixedSea(
      scenario.boardSpec ?? {
        ...emptyScenario(),
        name: scenario.name,
        targetScore: scenario.targetScore ?? DEFAULT_TARGET_SCORE,
      },
    ),
  );

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
 *
 * Authoring is offered per act: writing a new scenario, rewriting one, and
 * removing one are three separate permissions, so an account may well be able
 * to propose a map without being able to touch the ones already there. An
 * account holding none of them still gets the list, which is what
 * `extensions.read` allows — the list, and nothing that leads out of it.
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
  const [notice, setNotice] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerFilter>("all");
  const { requestConfirm, confirmDialog } = useConfirm();
  const { can } = useMyPermissions();
  const mayAuthor = can("scenarios.create");

  const specs = drawnSpecsOf(scenarios);
  const shown = scenariosMatching(scenarios, players);

  /** Says what just happened, then gets out of the way on its own. */
  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  }

  async function exportScenario(spec: ScenarioSpec) {
    setError(null);

    try {
      await navigator.clipboard.writeText(serialiseScenario(spec));
      flash(`« ${spec.name} » copié : colle-le où tu veux le remettre.`);
    } catch {
      setError("Copie impossible depuis ce navigateur.");
    }
  }

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
      <h3 className={sectionHeadingClass}>Scénarios · {shown.length}</h3>

      <ErrorText message={error} />

      {notice === null ? null : (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          {notice}
        </p>
      )}

      <ScenarioListPanel
        scenarios={shown}
        specs={specs}
        players={players}
        onPlayers={setPlayers}
        loading={loading}
        mayUpdate={can("scenarios.update")}
        mayCopy={mayAuthor}
        mayDelete={can("scenarios.delete")}
        onEdit={scenario => setEditing(draftOf(scenario))}
        onExport={exportScenario}
        onDelete={confirmDelete}
      />

      {mayAuthor ? (
        <ScenarioAuthoringBar
          takenNames={scenarios.map(s => s.name)}
          onCreate={setEditing}
          onSave={save}
          onImported={name => flash(`« ${name} » importé.`)}
          onError={setError}
        />
      ) : null}

      {confirmDialog}
    </section>
  );
}
