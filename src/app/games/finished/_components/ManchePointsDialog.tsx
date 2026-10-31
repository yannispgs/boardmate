"use client";

import { useMemo, useState } from "react";

import { Modal } from "@/components/Modal";
import { ScrollWheel } from "@/components/ScrollWheel";

/**
 * One cell's points, opened over the grid: a wheel of the values the points
 * can take — the game's step apart — scrolled with the thumb, the way a phone
 * picks a timer. The grid itself only has room for the figure.
 */
export function ManchePointsDialog({
  title,
  initial,
  step,
  max,
  onConfirm,
  onCancel,
}: Readonly<{
  /** Whose points, and which manche. */
  title: string;
  initial: number;
  step: number;
  /** The last value on the wheel — the most a manche can cost. */
  max: number;
  onConfirm: (points: number) => void;
  onCancel: () => void;
}>) {
  const [points, setPoints] = useState(initial);
  const values = useMemo(
    () =>
      Array.from({ length: Math.floor(max / step) + 1 }, (_v, i) => i * step),
    [max, step],
  );

  return (
    <Modal
      onClose={onCancel}
      label={title}
      className="w-full max-w-xs rounded-2xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-center text-base font-semibold">{title}</h2>

      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="w-32">
          <ScrollWheel
            values={values}
            value={points}
            label="Points"
            onChange={setPoints}
          />
        </div>
        <span className="text-xl font-semibold">points</span>
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
