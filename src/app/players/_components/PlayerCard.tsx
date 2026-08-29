"use client";

import { EyeIcon, EyeOffIcon, TrashIcon } from "@/components/icons";
import { dangerIconButtonClass, iconButtonClass } from "@/components/ui";
import type { Player } from "@/lib/domain";

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
