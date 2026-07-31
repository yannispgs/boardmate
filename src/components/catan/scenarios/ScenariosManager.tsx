"use client";

import { useState } from "react";

import { PlayerCountFilter } from "@/components/catan/PlayerCountFilter";
import { UploadIcon } from "@/components/icons";
import { sectionHeadingClass } from "@/components/ui";
import { useConfirm } from "@/components/use-confirm";
import {
  DEFAULT_TARGET_SCORE,
  emptyScenario,
  pruneStrandedPorts,
  stripFixedSea,
} from "@/lib/catan/scenario-draft";
import {
  matchesPlayers,
  type PlayerFilter,
  playerCountsOf,
} from "@/lib/catan/scenario-listing";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { freeName, serialiseScenario } from "@/lib/catan/scenario-transfer";
import type { Extension, ExtensionScenario } from "@/lib/domain";
import { type ScenarioDraft, useScenarios } from "@/lib/hooks/use-extensions";
import { ScenarioInUseError } from "@/lib/repositories/errors";
import { AuthoredScenarioCardList } from "./AuthoredScenarioCardList";
import { ScenarioEditor } from "./ScenarioEditor";
import { ScenarioImportSheet } from "./ScenarioImportSheet";

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
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerFilter>("all");
  const { requestConfirm, confirmDialog } = useConfirm();

  // A scenario with no map yet seats nobody, so it is never filtered out: it is
  // precisely the one still waiting to be drawn.
  const specs = scenarios.flatMap(s =>
    s.boardSpec === null ? [] : [s.boardSpec],
  );
  const shown = scenarios.filter(
    s => s.boardSpec === null || matchesPlayers(s.boardSpec, players),
  );

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

  /**
   * A scenario read back in. It comes in under a free name, so importing the
   * same map twice makes a variant of it instead of a second one to tell apart.
   */
  async function importScenario(spec: ScenarioSpec) {
    setError(null);

    const name = freeName(
      spec.name,
      scenarios.map(s => s.name),
    );

    try {
      await save({
        id: null,
        name,
        targetScore: spec.targetScore,
        boardSpec: { ...spec, name },
      });
      flash(`« ${name} » importé.`);
    } catch {
      setError("Import impossible. Réessaie.");
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

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {notice === null ? null : (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          {notice}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : (
        <>
          <div className="self-start">
            <PlayerCountFilter
              counts={playerCountsOf(specs)}
              value={players}
              onChange={setPlayers}
            />
          </div>

          <AuthoredScenarioCardList
            scenarios={shown}
            onEdit={scenario => setEditing(draftOf(scenario))}
            onExport={exportScenario}
            onDelete={confirmDelete}
            empty={
              players === "all"
                ? "Aucun scénario pour l'instant."
                : `Aucun scénario jouable à ${players} joueurs.`
            }
          />
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
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

      {confirmDialog}
    </section>
  );
}
