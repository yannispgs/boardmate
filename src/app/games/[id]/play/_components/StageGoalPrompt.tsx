"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import type { PlayerId } from "@/lib/domain";

/**
 * The end of a manche: the goal tile is scored while the birds are still on the
 * table, so the points are asked for here rather than at the end of the game.
 *
 * The app carries no barème — the green tiles pay by ranking, and the amounts
 * differ from one manche to the next — so what is entered is the **points** each
 * player takes, not what he counted. Reopening the prompt shows what was typed,
 * which is how a misheard total gets corrected.
 */
export function StageGoalPrompt({
  stage,
  stageLabel,
  goalLabel,
  players,
  initial,
  disabled,
  confirmLabel,
  onConfirm,
  onCancel,
}: Readonly<{
  stage: number;
  /** What the box calls a stage (« Manche »). */
  stageLabel: string;
  /** The goal tile, read out — « Œufs dans Mer ». */
  goalLabel: string;
  players: Array<{ id: PlayerId; name: string }>;
  /** Points already entered for this stage, by player. */
  initial: Record<string, number>;
  disabled: boolean;
  /** What validating does next (« Manche suivante », « Enregistrer »). */
  confirmLabel: string;
  onConfirm: (points: Array<{ playerId: PlayerId; points: number }>) => void;
  onCancel: () => void;
}>) {
  const [raw, setRaw] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      players.map(p => [p.id, String(initial[p.id] ?? 0)] as const),
    ),
  );

  function confirm() {
    onConfirm(
      players.map(p => ({ playerId: p.id, points: parsePoints(raw[p.id]) })),
    );
  }

  return (
    <Modal
      onClose={onCancel}
      label={`Objectif de la ${stageLabel.toLowerCase()} ${stage}`}
      className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-base font-semibold">
        Fin de la {stageLabel.toLowerCase()} {stage}
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {goalLabel === ""
          ? "Points marqués par chacun sur l'objectif."
          : `Objectif : ${goalLabel}. Points marqués par chacun.`}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {players.map(p => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10"
          >
            <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
            <input
              type="number"
              inputMode="numeric"
              value={raw[p.id] ?? ""}
              onChange={event =>
                setRaw(current => ({ ...current, [p.id]: event.target.value }))
              }
              className="w-20 rounded-lg border border-black/10 bg-transparent px-2 py-1 text-right text-sm tabular-nums dark:border-white/15"
            />
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={confirm}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** An emptied or half-typed box is worth nothing, never NaN. */
function parsePoints(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) ? parsed : 0;
}
