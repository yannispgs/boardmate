"use client";

import { Modal } from "@/components/Modal";

import { PointsWheelPanel } from "./PointsWheelPanel";

/**
 * One cell's points, opened over the grid: the grid itself only has room for
 * the figure. See {@link PointsWheelPanel}.
 */
export function ManchePointsDialog({
  title,
  values,
  initial,
  onConfirm,
  onCancel,
}: Readonly<{
  /** Whose points, and which manche. */
  title: string;
  /** What the wheel offers, top first — read once, as the dialog opens. */
  values: readonly number[];
  initial: number | null;
  onConfirm: (points: number) => void;
  onCancel: () => void;
}>) {
  return (
    <Modal
      onClose={onCancel}
      label={title}
      className="w-full max-w-xs rounded-2xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <PointsWheelPanel
        title={title}
        values={values}
        initial={initial}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Modal>
  );
}
