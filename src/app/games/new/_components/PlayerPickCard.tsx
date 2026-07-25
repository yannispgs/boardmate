"use client";

import type { Player } from "@/lib/domain";
import { tileClass } from "./tile-class";

/**
 * One player to pick for a new game. A picked player wears their seat number —
 * or a plain checkmark when the game is simultaneous and has no turn order.
 */
export function PlayerPickCard({
  player,
  order,
  simultaneous,
  onToggle,
}: {
  player: Player;
  /** The player's 1-based seat, or `null` when they're not in the game. */
  order: number | null;
  simultaneous: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${tileClass} flex w-full items-center justify-between ${
        order === null ? "" : "border-indigo-500 ring-1 ring-indigo-500"
      }`}
    >
      <span>{player.name}</span>
      {order === null ? null : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
          {simultaneous ? "✓" : order}
        </span>
      )}
    </button>
  );
}
