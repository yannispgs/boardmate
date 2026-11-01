"use client";

import { useState } from "react";

import { DialogActions } from "@/components/DialogActions";
import { ScrollWheel } from "@/components/ScrollWheel";

/**
 * One player's points for one manche, picked on a wheel of the values they can
 * take — the game's step apart on Phase 10, only what a bet can pay on Luz —
 * scrolled with the thumb, the way a phone picks a timer.
 *
 * The panel alone, without a frame: the finished-game grid opens it in a modal
 * of its own, the end-of-manche prompt shows it in place of its list.
 */
export function PointsWheelPanel({
  title,
  values,
  initial,
  onConfirm,
  onCancel,
}: Readonly<{
  /** Whose points, and which manche. */
  title: string;
  /** What the wheel offers, top first — read once, as the panel opens. */
  values: readonly number[];
  /** Where the wheel opens; its first value when unset or out of reach. */
  initial: number | null;
  onConfirm: (points: number) => void;
  onCancel: () => void;
}>) {
  // Held as they were on opening: a list rebuilt on every render would send
  // the wheel back to where it started, and nothing that shapes it can change
  // while the panel is up.
  const [wheel] = useState(values);
  const [points, setPoints] = useState(
    initial !== null && values.includes(initial) ? initial : values[0],
  );

  return (
    <>
      <h2 className="text-center text-base font-semibold">{title}</h2>

      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="w-32">
          <ScrollWheel
            values={wheel}
            value={points}
            label="Points"
            onChange={setPoints}
          />
        </div>
        <span className="text-xl font-semibold">points</span>
      </div>

      <DialogActions onConfirm={() => onConfirm(points)} onCancel={onCancel} />
    </>
  );
}
