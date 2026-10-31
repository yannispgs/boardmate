"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import type { PlayerId } from "@/lib/domain";
import { pointsFloor } from "@/lib/game/ladder";
import type { StageEntry } from "@/lib/game/stage-tally";

import { StagePointsRow } from "../../../_components/StagePointsRow";
import type { PromptRungs } from "./stage-tallies";

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
  step = 1,
  rungs = null,
  initialCleared = {},
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
  /** How far one tap of an arrow goes (Phase 10's cards count by fives). */
  step?: number;
  /**
   * On a laddered game, the rung each player is working on — « Phase 4 » — and
   * its name; each player then gets a box to tick once he laid it down. Null
   * on every other game, and in the variant where everybody climbs anyway.
   */
  rungs?: PromptRungs;
  /** Who was already ticked for this stage, by player. */
  initialCleared?: Record<string, boolean>;
  disabled: boolean;
  /** What validating does next (« Manche suivante », « Enregistrer »). */
  confirmLabel: string;
  onConfirm: (points: StageEntry[]) => void;
  onCancel: () => void;
}>) {
  // Without his phase down a player still holds his whole hand (Phase 10: at
  // least 50): that is where he starts, and he can't go below it.
  const floorOf = (ticked: boolean) =>
    rungs === null ? 0 : pointsFloor(ticked, rungs.rules);

  const [cleared, setCleared] =
    useState<Record<string, boolean>>(initialCleared);
  const [points, setPoints] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      players.map(
        p =>
          [
            p.id,
            initial[p.id] ?? floorOf(initialCleared[p.id] === true),
          ] as const,
      ),
    ),
  );

  const entries = players.map(p => ({
    playerId: p.id,
    points: points[p.id] ?? 0,
    ...(rungs === null ? {} : { cleared: cleared[p.id] === true }),
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
          <StagePointsRow
            key={p.id}
            player={p}
            points={points[p.id] ?? 0}
            min={floorOf(cleared[p.id] === true)}
            max={max}
            step={step}
            rung={rungs === null ? null : (rungs.of[p.id] ?? null)}
            rungLabel={rungs?.label ?? ""}
            cleared={cleared[p.id] === true}
            disabled={disabled}
            onPoints={next =>
              setPoints(current => ({ ...current, [p.id]: next }))
            }
            onCleared={next => {
              setCleared(current => ({ ...current, [p.id]: next }));
              // Unticked, he holds his whole hand again.
              setPoints(current => ({
                ...current,
                [p.id]: Math.max(current[p.id] ?? 0, floorOf(next)),
              }));
            }}
          />
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
