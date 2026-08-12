"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import { NumberStepper } from "@/components/NumberStepper";
import type { PlayerId } from "@/lib/domain";
import type { StageEntry } from "@/lib/game/stage-tally";

/**
 * The end of a manche: what each player takes is written down there and then,
 * while the cards and the birds are still on the table, rather than at the end
 * of the game.
 *
 * The app carries no barème — Wingspan's green tiles pay by ranking and the
 * amounts differ from one manche to the next, Odin's points are what stayed in
 * the hand — so what is entered is the **points** each player takes, not what
 * he counted. Reopening the prompt shows what was typed, which is how a
 * misheard total gets corrected.
 *
 * Those points are small numbers, so each one is nudged with a −/+ pair rather
 * than typed — quicker round a table than a keyboard per player.
 */
export function StagePointsPrompt({
  stage,
  stageLabel,
  intro,
  players,
  initial,
  validate,
  max = null,
  disabled,
  confirmLabel,
  onConfirm,
  onCancel,
}: Readonly<{
  stage: number;
  /** What the box calls a stage (« Manche »). */
  stageLabel: string;
  /** The line above the boxes — the goal tile read out, or the rule to apply. */
  intro: string;
  players: Array<{ id: PlayerId; name: string }>;
  /** Points already entered for this stage, by player. */
  initial: Record<string, number>;
  /**
   * Why what is typed can't be recorded, or null when it can. Games that accept
   * any set of numbers (Wingspan) leave it out; Odin refuses a manche nobody
   * went out of, since such a manche cannot have happened.
   */
  validate?: (entries: StageEntry[]) => string | null;
  /**
   * The most a stage can pay, when the rules say (Odin: 9). Only the arrows
   * stop there — a number typed over the cap is left alone, so `validate` gets
   * to say what is wrong with it instead of the box quietly rewriting it.
   */
  max?: number | null;
  disabled: boolean;
  /** What validating does next (« Manche suivante », « Enregistrer »). */
  confirmLabel: string;
  onConfirm: (points: StageEntry[]) => void;
  onCancel: () => void;
}>) {
  const [points, setPoints] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map(p => [p.id, initial[p.id] ?? 0] as const)),
  );

  const entries = players.map(p => ({
    playerId: p.id,
    points: points[p.id] ?? 0,
  }));
  const refused = validate?.(entries) ?? null;

  return (
    <Modal
      onClose={onCancel}
      label={`Points de la ${stageLabel.toLowerCase()} ${stage}`}
      className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-base font-semibold">
        Fin de la {stageLabel.toLowerCase()} {stage}
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{intro}</p>

      <ul className="mt-4 flex flex-col gap-2">
        {players.map(p => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10"
          >
            <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
            <NumberStepper
              label={p.name}
              value={points[p.id] ?? 0}
              max={max}
              disabled={disabled}
              onChange={next =>
                setPoints(current => ({ ...current, [p.id]: next }))
              }
            />
          </li>
        ))}
      </ul>

      {refused === null ? null : (
        <p className="mt-3 text-rose-600 text-sm dark:text-rose-400">
          {refused}
        </p>
      )}

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
          disabled={disabled || refused !== null}
          onClick={() => onConfirm(entries)}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
