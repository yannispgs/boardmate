"use client";

import type { MoveDirection } from "@/lib/game/reorder";

const moveBtn =
  "rounded-md border border-black/10 px-1.5 py-1 text-xs leading-none text-zinc-500 transition enabled:hover:border-indigo-400 enabled:hover:text-indigo-600 disabled:opacity-30 dark:border-white/15";

/**
 * The `↑` / `↓` pair that reorders whatever row it sits on. Buttons rather than
 * drag-and-drop: these are phone-first lists that scroll, and dragging a row in
 * a scrolling list fights the scroll instead of moving the row.
 */
export function MoveButtons({
  onMove,
  canUp,
  canDown,
  disabled = false,
}: Readonly<{
  onMove: (direction: MoveDirection) => void;
  canUp: boolean;
  canDown: boolean;
  /** Freezes both arrows — a save is in flight, or the list is read-only. */
  disabled?: boolean;
}>) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => onMove("up")}
        disabled={disabled || !canUp}
        aria-label="Monter"
        title="Monter"
        className={moveBtn}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove("down")}
        disabled={disabled || !canDown}
        aria-label="Descendre"
        title="Descendre"
        className={moveBtn}
      >
        ↓
      </button>
    </div>
  );
}
