"use client";

import { useMemo, useState } from "react";

import { BoardPreview } from "@/components/catan/BoardPreview";
import { GeneratorSettings } from "@/components/catan/GeneratorSettings";
import { EraserIcon } from "@/components/icons";
import { StickyActionBar } from "@/components/StickyActionBar";
import { fieldClass, sectionHeadingClass } from "@/components/ui";
import { useConfirm } from "@/components/use-confirm";
import { scenarioOptions } from "@/lib/catan/generator-options";
import {
  eraseCell,
  paintCell,
  setGeneratorOptions,
  setScenarioName,
  setStaticTile,
  setTargetScore,
  setZoneBalance,
  togglePortSlot,
} from "@/lib/catan/scenario-draft";
import { playerCountsLabel } from "@/lib/catan/scenario-listing";
import {
  bearsToken,
  boardWidth,
  type ScenarioSpec,
  type SpecCell,
  type SpecPort,
  type SpecTerrain,
  validateScenarioDraft,
} from "@/lib/catan/scenario-spec";
import type { ScenarioDraft } from "@/lib/hooks/use-extensions";
import { BoardPortsPanel } from "./BoardPortsPanel";
import { BoardTabs } from "./BoardTabs";
import { type CanvasTool, ScenarioCanvas } from "./ScenarioCanvas";
import { SpecIssueList } from "./SpecIssueList";
import { StaticTileFields } from "./StaticTileFields";
import { WidthStepper } from "./WidthStepper";
import { ZoneBalanceCardList } from "./ZoneBalanceCardList";
import { ZoneSection } from "./ZoneSection";

const TOOLS: { value: CanvasTool; label: string; hint: string }[] = [
  { value: "paint", label: "Peindre", hint: "Ajoute les cases à la zone." },
  {
    value: "static",
    label: "Tuile fixe",
    hint: "Pose une tuile identique à chaque partie.",
  },
  {
    value: "port",
    label: "Ports",
    hint: "Clique une case de terre, puis l'arête où le port est imprimé. Seules les cases posables répondent, et seules leurs arêtes donnant sur la mer à chaque partie sont proposées ; deux ports laissent toujours un sommet libre entre eux, mais une même tuile peut en porter deux. Le port rejoint la zone de la case, ou le plateau si la case est une tuile fixe.",
  },
];

/** Rubbing out has no button of its own up here: it lives on the map itself. */
const ERASE_HINT = "Gomme : les cases repartent au plateau vide.";

/** The word of help under the tools, for whatever is in the author's hand. */
function toolHint(tool: CanvasTool, zones: number): string | undefined {
  if (tool === "erase") {
    return ERASE_HINT;
  }

  if (tool === "paint" && zones === 0) {
    return "Aucune zone à peindre : ajoute-en une, ou dessine la carte tuile fixe par tuile fixe.";
  }

  return TOOLS.find(item => item.value === tool)?.hint;
}

const toolButtonClass = (active: boolean) =>
  `rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
    active
      ? "bg-indigo-600 text-white"
      : "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5"
  }`;

/** How a board is named, from the player counts it serves. */
function boardLabel(players: number[]): string {
  return players.length === 0 ? "Sans joueurs" : playerCountsLabel(players);
}

/**
 * The scenario editor: a map painted zone by zone, one board per player count,
 * checked on every change. Saving is only offered once nothing is left to fix,
 * so a scenario in the database is always one the generator can draw.
 */
export function ScenarioEditor({
  draft,
  onSave,
  onClose,
}: Readonly<{
  draft: ScenarioDraft;
  onSave: (draft: ScenarioDraft) => Promise<void>;
  onClose: () => void;
}>) {
  const [spec, setSpec] = useState<ScenarioSpec>(draft.boardSpec);
  const [boardIndex, setBoardIndex] = useState(0);
  const [zoneIndex, setZoneIndex] = useState(0);
  const [tool, setTool] = useState<CanvasTool>("paint");
  const [staticTerrain, setStaticTerrain] = useState<SpecTerrain>("sea");
  const [staticNumber, setStaticNumber] = useState(2);
  const [selected, setSelected] = useState<SpecCell | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const { requestConfirm, confirmDialog } = useConfirm();

  const board = spec.boards[boardIndex] ?? spec.boards[0];
  const zone = Math.min(zoneIndex, board.zones.length - 1);
  const issues = validateScenarioDraft(spec);
  const labels = spec.boards.map(b => boardLabel(b.players));
  const width = boardWidth(board);
  // Kept identical between two paint strokes: the preview redraws on it, and a
  // fresh object every keystroke would have it redraw for nothing.
  const generator = useMemo(
    () => scenarioOptions(spec.options),
    [spec.options],
  );

  function change(next: ScenarioSpec) {
    setSpec(next);
    setDirty(true);
  }

  function handleCell(cell: SpecCell) {
    if (tool === "paint") {
      change(paintCell(spec, boardIndex, zone, cell));
    } else if (tool === "erase") {
      change(eraseCell(spec, boardIndex, cell));
    } else if (tool === "static") {
      change(
        setStaticTile(
          spec,
          boardIndex,
          cell,
          staticTerrain,
          // The sea and the deserts carry no token, whatever was last picked
          // in a field the terrain before them offered.
          bearsToken(staticTerrain) ? staticNumber : undefined,
        ),
      );
    } else {
      setSelected(cell);
    }
  }

  function handlePort(port: SpecPort) {
    // Which bag it lands in follows the space it hugs, not the zone being
    // edited — a harbour on a static tile belongs to the board itself.
    change(togglePortSlot(spec, boardIndex, port));
  }

  function pickZone(index: number) {
    setZoneIndex(index);
    setSelected(null);
  }

  function pickBoard(index: number) {
    setBoardIndex(index);
    setZoneIndex(0);
    setSelected(null);
  }

  async function save() {
    setError(null);
    setSaving(true);
    // A stray space around the name is not part of it: kept, it sorts the
    // scenario apart from where it reads and indents it in every list.
    const named = { ...spec, name: spec.name.trim() };

    try {
      await onSave({
        id: draft.id,
        name: named.name,
        targetScore: named.targetScore,
        boardSpec: named,
      });
      onClose();
    } catch {
      setError("Enregistrement impossible. Réessaie.");
      setSaving(false);
    }
  }

  function close() {
    if (!dirty) {
      onClose();

      return;
    }

    requestConfirm({
      message:
        "Quitter l'éditeur ? Les modifications non enregistrées seront perdues.",
      confirmLabel: "Quitter",
      onConfirm: onClose,
    });
  }

  const blocked = issues.length > 0 || spec.name.trim() === "";

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* The name and the target scroll away with everything else. Pinned above
          the canvas they ate close to half a phone screen, for two fields set
          once and never looked at again. */}
      <div className="flex flex-1 flex-col gap-6 pb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm">
            <span className={sectionHeadingClass}>Nom du scénario</span>
            <input
              value={spec.name}
              onChange={e => change(setScenarioName(spec, e.target.value))}
              placeholder="Les quatre îles"
              className={fieldClass}
            />
          </label>
          <label className="flex w-32 flex-col gap-1 text-sm">
            <span className={sectionHeadingClass}>Score à atteindre</span>
            <input
              type="number"
              min={1}
              max={30}
              value={spec.targetScore}
              onChange={e =>
                change(setTargetScore(spec, Number(e.target.value)))
              }
              className={fieldClass}
            />
          </label>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="flex shrink-0 flex-col gap-5 lg:w-80">
            <section className="flex flex-col gap-2">
              <h3 className={sectionHeadingClass}>Outil</h3>
              <div className="flex rounded-lg border border-black/10 p-1 dark:border-white/10">
                {TOOLS.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setTool(item.value);
                      setSelected(null);
                    }}
                    className={toolButtonClass(item.value === tool)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {toolHint(tool, board.zones.length)}
              </p>

              {tool === "static" ? (
                <StaticTileFields
                  terrain={staticTerrain}
                  token={staticNumber}
                  onTerrain={setStaticTerrain}
                  onToken={setStaticNumber}
                />
              ) : null}
            </section>

            {/* A fixed tile belongs to no zone: showing the zone being edited,
                and the bag it draws from, only muddied a mode that has nothing
                to do with either. */}
            {tool === "static" ? null : (
              <ZoneSection
                spec={spec}
                board={boardIndex}
                zone={zone}
                onChange={change}
                onPick={pickZone}
              />
            )}

            <BoardPortsPanel spec={spec} board={boardIndex} onChange={change} />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* One frame around everything that is about this board: which one
                it is and who plays it, the map itself, and how wide it is cut.
                What sits outside — the tool, the zone, the checks — is either
                about the scenario or about what is painted on the map. */}
            <div className="flex flex-col gap-4 rounded-xl border border-black/10 p-3 dark:border-white/10">
              <BoardTabs
                spec={spec}
                board={boardIndex}
                labels={labels}
                onChange={change}
                onPick={pickBoard}
              />

              {/* The eraser sits on the map rather than among the tools: it is
                  reached where it is used, in the corner the outline leaves
                  empty, and it toggles — off, painting takes over again. */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTool(current =>
                      current === "erase" ? "paint" : "erase",
                    );
                    setSelected(null);
                  }}
                  title={ERASE_HINT}
                  aria-label="Gomme"
                  className={`absolute top-2 right-2 rounded-lg border p-2 transition ${
                    tool === "erase"
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-black/10 bg-white/70 text-zinc-600 hover:bg-black/5 dark:border-white/15 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:bg-white/10"
                  }`}
                >
                  <EraserIcon />
                </button>
                <ScenarioCanvas
                  board={board}
                  width={width}
                  activeZone={zone}
                  tool={tool}
                  selected={selected}
                  onCell={handleCell}
                  onPort={handlePort}
                />
              </div>

              <WidthStepper
                spec={spec}
                board={boardIndex}
                width={width}
                onChange={change}
              />
            </div>

            <section className="flex flex-col gap-2">
              <h3 className={sectionHeadingClass}>Vérifications</h3>
              <SpecIssueList issues={issues} boardLabels={labels} />
            </section>

            {/* The settings sit against the preview rather than up with the
                name and the score: they are set by looking at what they do to
                the map, not typed in once. They belong to the scenario all the
                same — the generator starts every draw of it from here. */}
            <section className="flex flex-col gap-2">
              <h3 className={sectionHeadingClass}>Tirage</h3>
              <GeneratorSettings
                options={generator}
                onChange={patch => change(setGeneratorOptions(spec, patch))}
                deserts="none"
                goldRivers
                zones={
                  <ZoneBalanceCardList
                    spec={spec}
                    board={boardIndex}
                    onChange={(zone, tolerance) =>
                      change(setZoneBalance(spec, boardIndex, zone, tolerance))
                    }
                  />
                }
              />

              {issues.length === 0 && board.players.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPreview(v => !v)}
                    className="self-start rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                  >
                    {preview ? "Masquer l'aperçu" : "Aperçu du tirage"}
                  </button>
                  {preview ? (
                    <BoardPreview
                      spec={spec}
                      players={board.players[0]}
                      options={generator}
                      showWarnings
                    />
                  ) : null}
                </>
              ) : null}
            </section>
          </div>
        </div>
      </div>

      <StickyActionBar>
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={blocked || saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-black/10 px-4 py-2 font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Annuler
          </button>
          {blocked ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {spec.name.trim() === ""
                ? "Donne un nom au scénario."
                : "Corrige les vérifications pour enregistrer."}
            </span>
          ) : null}
        </div>
      </StickyActionBar>

      {confirmDialog}
    </div>
  );
}
