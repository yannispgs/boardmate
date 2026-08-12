"use client";

import { MoveButtons } from "@/components/MoveButtons";
import type { MoveDirection } from "@/lib/game/reorder";

/**
 * One seat of the table being corrected: its place round the table, who sits
 * there, and the arrows that move them.
 */
export function SeatOrderCard({
  seat,
  name,
  canUp,
  canDown,
  disabled,
  onMove,
}: Readonly<{
  /** Which place round the table this is, counted from 1 as it is spoken. */
  seat: number;
  name: string;
  canUp: boolean;
  canDown: boolean;
  disabled: boolean;
  onMove: (direction: MoveDirection) => void;
}>) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15">
      <span className="w-5 shrink-0 text-sm tabular-nums text-zinc-400">
        {seat}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {name}
      </span>
      <MoveButtons
        onMove={onMove}
        canUp={canUp}
        canDown={canDown}
        disabled={disabled}
      />
    </li>
  );
}
