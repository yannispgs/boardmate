"use client";

import { useState } from "react";

import { SPEC_TERRAIN_NAME } from "@/components/catan/terrain-labels";
import { StickyActionBar } from "@/components/StickyActionBar";
import { sectionHeadingClass } from "@/components/ui";
import { useConfirm } from "@/components/use-confirm";
import { playerGroupLabel } from "@/lib/catan/marins";
import {
  addBoard,
  addZone,
  duplicateBoard,
  eraseCell,
  narrowestWidth,
  paintCell,
  removeBoard,
  setBoardPlayers,
  setBoardWidth,
  setScenarioName,
  setStaticTile,
  setTargetScore,
  togglePortSlot,
  zoneOfPortSlot,
} from "@/lib/catan/scenario-draft";
import {
  boardWidth,
  MAX_WIDTH,
  MIN_WIDTH,
  type ScenarioSpec,
  type SpecCell,
  type SpecPort,
  type SpecTerrain,
  validateScenarioSpec,
} from "@/lib/catan/scenario-spec";
import type { ScenarioDraft } from "@/lib/hooks/use-extensions";
import { BoardPreview } from "./BoardPreview";
import { type CanvasTool, ScenarioCanvas, zoneColor } from "./ScenarioCanvas";
import { SpecIssueList } from "./SpecIssueList";
import { ZonePanel } from "./ZonePanel";

/** The player counts a Marins map is drawn for. */
const PLAYER_COUNTS = [3, 4, 5, 6];

/** The terrains a static tile can be fixed to, sea first. */
const STATIC_TERRAINS: SpecTerrain[] = [
  "sea",
  "forest",
  "pasture",
  "fields",
  "hills",
  "mountains",
  "gold",
  "desert",
];

const TOOLS: { value: CanvasTool; label: string; hint: string }[] = [
  { value: "paint", label: "Peindre", hint: "Ajoute les cases à la zone." },
  { value: "erase", label: "Effacer", hint: "Rend les cases au plateau vide." },
  {
    value: "static",
    label: "Tuile fixe",
    hint: "Pose une tuile identique à chaque partie.",
  },
  {
    value: "port",
    label: "Ports",
    hint: "Clique une case, puis l'arête où le port est imprimé.",
  },
];

const toolButtonClass = (active: boolean) =>
  `rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
    active
      ? "bg-indigo-600 text-white"
      : "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5"
  }`;

const chipClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition ${
    active
      ? "border-indigo-500 bg-indigo-500/10 font-medium text-indigo-700 dark:text-indigo-300"
      : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
  }`;

const fieldClass =
  "rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15";

/** How a board is named, from the player counts it serves. */
function boardLabel(players: number[]): string {
  return players.length === 0 ? "Sans joueurs" : playerGroupLabel(players);
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
}: {
  draft: ScenarioDraft;
  onSave: (draft: ScenarioDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [spec, setSpec] = useState<ScenarioSpec>(draft.boardSpec);
  const [boardIndex, setBoardIndex] = useState(0);
  const [zoneIndex, setZoneIndex] = useState(0);
  const [tool, setTool] = useState<CanvasTool>("paint");
  const [staticTerrain, setStaticTerrain] = useState<SpecTerrain>("sea");
  const [staticNumber, setStaticNumber] = useState<number | "">("");
  const [selected, setSelected] = useState<SpecCell | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const { requestConfirm, confirmDialog } = useConfirm();

  const board = spec.boards[boardIndex] ?? spec.boards[0];
  const zone = Math.min(zoneIndex, board.zones.length - 1);
  const issues = validateScenarioSpec(spec);
  const labels = spec.boards.map(b => boardLabel(b.players));
  const width = boardWidth(board);
  // Never narrower than what is already painted, so nothing can hide off-map.
  const floor = narrowestWidth(board);
  const taken = new Set(spec.boards.flatMap(b => b.players));
  const free = PLAYER_COUNTS.filter(count => !taken.has(count));

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
          staticNumber === "" ? undefined : staticNumber,
        ),
      );
    } else {
      setSelected(cell);
    }
  }

  function handlePort(port: SpecPort) {
    // Unpinning has to reach the zone that pinned it, not the one being edited.
    const owner = zoneOfPortSlot(board, port);

    change(togglePortSlot(spec, boardIndex, owner ?? zone, port));
  }

  function pickBoard(index: number) {
    setBoardIndex(index);
    setZoneIndex(0);
    setSelected(null);
  }

  function togglePlayers(count: number) {
    const players = board.players.includes(count)
      ? board.players.filter(p => p !== count)
      : [...board.players, count].sort((a, b) => a - b);

    change(setBoardPlayers(spec, boardIndex, players));
  }

  function dropBoard() {
    requestConfirm({
      message: `Supprimer le plateau « ${labels[boardIndex]} » ? Son plan est perdu.`,
      confirmLabel: "Supprimer",
      onConfirm: () => {
        change(removeBoard(spec, boardIndex));
        pickBoard(0);
      },
    });
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await onSave({
        id: draft.id,
        name: spec.name,
        targetScore: spec.targetScore,
        boardSpec: spec,
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
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
            onChange={e => change(setTargetScore(spec, Number(e.target.value)))}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4 lg:flex-row">
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
              {TOOLS.find(item => item.value === tool)?.hint}
            </p>

            {tool === "static" ? (
              <div className="flex items-center gap-2">
                <select
                  value={staticTerrain}
                  onChange={e =>
                    setStaticTerrain(e.target.value as SpecTerrain)
                  }
                  className={`${fieldClass} flex-1`}
                >
                  {STATIC_TERRAINS.map(terrain => (
                    <option key={terrain} value={terrain}>
                      {SPEC_TERRAIN_NAME[terrain]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={staticNumber}
                  placeholder="jeton"
                  onChange={e =>
                    setStaticNumber(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className={`${fieldClass} w-24`}
                />
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className={sectionHeadingClass}>Zones</h3>
            <div className="flex flex-wrap gap-2">
              {board.zones.map((z, index) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: a zone is identified by its index, which is how every draft operation names it
                  key={index}
                  type="button"
                  onClick={() => {
                    setZoneIndex(index);
                    setSelected(null);
                  }}
                  className={`${chipClass(index === zone)} flex items-center gap-2`}
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: zoneColor(index) }}
                  />
                  {z.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  change(addZone(spec, boardIndex));
                  setZoneIndex(board.zones.length);
                }}
                className={chipClass(false)}
              >
                + Zone
              </button>
            </div>
          </section>

          <ZonePanel
            spec={spec}
            board={boardIndex}
            zone={zone}
            onChange={change}
            onRemoved={() => setZoneIndex(0)}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section className="flex flex-col gap-2">
            <h3 className={sectionHeadingClass}>Plateaux</h3>
            <div className="flex flex-wrap gap-2">
              {labels.map((label, index) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: a board is identified by its index, which is how every draft operation names it
                  key={index}
                  type="button"
                  onClick={() => pickBoard(index)}
                  className={chipClass(index === boardIndex)}
                >
                  {label}
                </button>
              ))}
              {free.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    change(addBoard(spec, [free[0]]));
                    pickBoard(spec.boards.length);
                  }}
                  className={chipClass(false)}
                >
                  + Plateau
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                Utilisé à
              </span>
              {PLAYER_COUNTS.map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => togglePlayers(count)}
                  disabled={taken.has(count) && !board.players.includes(count)}
                  className={`${chipClass(board.players.includes(count))} disabled:opacity-30`}
                >
                  {count}
                </button>
              ))}
              {free.map(count => (
                <button
                  key={`copy-${count}`}
                  type="button"
                  onClick={() => {
                    change(duplicateBoard(spec, boardIndex, [count]));
                    pickBoard(spec.boards.length);
                  }}
                  className={chipClass(false)}
                >
                  Dupliquer vers {count} joueurs
                </button>
              ))}
              {spec.boards.length > 1 ? (
                <button
                  type="button"
                  onClick={dropBoard}
                  className="rounded-full border border-black/10 px-3 py-1 text-sm text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Supprimer ce plateau
                </button>
              ) : null}
            </div>
          </section>

          <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
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

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              Largeur du plateau
            </span>
            <button
              type="button"
              onClick={() => change(setBoardWidth(spec, boardIndex, width - 1))}
              disabled={width <= floor}
              className={`${chipClass(false)} disabled:opacity-30`}
            >
              −
            </button>
            <span className="w-6 text-center tabular-nums font-semibold">
              {width}
            </span>
            <button
              type="button"
              onClick={() => change(setBoardWidth(spec, boardIndex, width + 1))}
              disabled={width >= MAX_WIDTH}
              className={`${chipClass(false)} disabled:opacity-30`}
            >
              +
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {width} tuiles sur les rangées du bord, {width + 3} au milieu
              {width <= floor && width > MIN_WIDTH
                ? " · réduire découperait une zone peinte"
                : ""}
            </span>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className={sectionHeadingClass}>Vérifications</h3>
            <SpecIssueList issues={issues} boardLabels={labels} />
          </section>

          {issues.length === 0 && board.players.length > 0 ? (
            <section className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPreview(v => !v)}
                className="self-start rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                {preview ? "Masquer l'aperçu" : "Aperçu du tirage"}
              </button>
              {preview ? (
                <BoardPreview spec={spec} players={board.players[0]} />
              ) : null}
            </section>
          ) : null}
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
