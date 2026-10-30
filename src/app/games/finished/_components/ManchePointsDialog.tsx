"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";

const BIG_NUDGE =
  "flex h-16 w-16 items-center justify-center rounded-full border border-black/15 text-3xl leading-none transition hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/5";

/**
 * One cell's points, opened over the grid: the figure large in the middle of
 * the screen, moved up and down by the game's step with two big buttons — the
 * grid itself only has room for the figure.
 */
export function ManchePointsDialog({
  title,
  initial,
  step,
  onConfirm,
  onCancel,
}: Readonly<{
  /** Whose points, and which manche. */
  title: string;
  initial: number;
  step: number;
  onConfirm: (points: number) => void;
  onCancel: () => void;
}>) {
  const [points, setPoints] = useState(initial);

  return (
    <Modal
      onClose={onCancel}
      label={title}
      className="w-full max-w-xs rounded-2xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-center text-base font-semibold">{title}</h2>

      <div className="mt-6 flex items-center justify-center gap-5">
        <button
          type="button"
          aria-label={`${step} de moins`}
          disabled={points - step < 0}
          onClick={() => setPoints(points - step)}
          className={BIG_NUDGE}
        >
          −
        </button>
        <span
          data-testid="dialog-points"
          className="min-w-20 text-center text-5xl font-bold tabular-nums"
        >
          {points}
        </span>
        <button
          type="button"
          aria-label={`${step} de plus`}
          onClick={() => setPoints(points + step)}
          className={BIG_NUDGE}
        >
          +
        </button>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={() => onConfirm(points)}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-indigo-500"
        >
          Valider
        </button>
      </div>
    </Modal>
  );
}
