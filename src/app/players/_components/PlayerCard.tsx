"use client";

import { EyeIcon, EyeOffIcon, TrashIcon } from "@/components/icons";
import type { Player } from "@/lib/domain";

const iconButtonClass =
  "rounded-md border border-black/10 p-1.5 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";
const dangerIconButtonClass =
  "rounded-md border border-black/10 p-1.5 text-red-600 transition hover:bg-red-50 dark:border-white/15 dark:text-red-400 dark:hover:bg-red-950/40";

/**
 * A single player row: name + deactivate/reactivate toggle + delete. Whether
 * it's an active or deactivated player is just the `dimmed` + `actionLabel`
 * inputs (eye-off to deactivate, eye to reactivate).
 */
export function PlayerCard({
  player,
  onToggle,
  onDelete,
  actionLabel,
  dimmed = false,
}: Readonly<{
  player: Player;
  onToggle: (player: Player) => void;
  onDelete: (player: Player) => void;
  actionLabel: string;
  dimmed?: boolean;
}>) {
  return (
    <li
      className={`flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900 ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <span className="min-w-0 flex-1 truncate font-medium">{player.name}</span>
      <button
        type="button"
        onClick={() => onToggle(player)}
        aria-label={`${actionLabel} ${player.name}`}
        title={actionLabel}
        className={iconButtonClass}
      >
        {dimmed ? <EyeIcon /> : <EyeOffIcon />}
      </button>
      <button
        type="button"
        onClick={() => onDelete(player)}
        aria-label={`Supprimer ${player.name}`}
        title="Supprimer"
        className={dangerIconButtonClass}
      >
        <TrashIcon />
      </button>
    </li>
  );
}
