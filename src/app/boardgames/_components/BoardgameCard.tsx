"use client";

import Link from "next/link";

import {
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  SlidersIcon,
  TrashIcon,
} from "@/components/icons";
import { dangerIconButtonClass, iconButtonClass } from "@/components/ui";
import type { Boardgame } from "@/lib/domain";

/** One-line summary of a boardgame's player range / duration / tags. */
function formatMeta(b: Boardgame): string {
  const parts: string[] = [];
  if (b.minPlayers != null && b.maxPlayers != null) {
    parts.push(
      b.minPlayers === b.maxPlayers
        ? `${b.minPlayers} joueurs`
        : `${b.minPlayers}–${b.maxPlayers} joueurs`,
    );
  }
  if (b.avgDurationMin != null) {
    parts.push(`~${b.avgDurationMin} min`);
  }
  if (b.tags.length > 0) {
    parts.push(b.tags.join(" · "));
  }
  return parts.join(" · ") || "Aucune info";
}

/**
 * A single boardgame row: logo, name + meta, and the configs / edit /
 * deactivate / delete actions. Whether it's an active or deactivated game is
 * just the `dimmed` + `actionLabel` inputs.
 */
export function BoardgameCard({
  boardgame: b,
  onEdit,
  onToggle,
  onDelete,
  actionLabel,
  dimmed = false,
}: {
  boardgame: Boardgame;
  onEdit: (b: Boardgame) => void;
  onToggle: (b: Boardgame) => void;
  onDelete: (b: Boardgame) => void;
  actionLabel: string;
  dimmed?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900 ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      {b.logoUrl ? (
        // biome-ignore lint/performance/noImgElement: arbitrary Storage URLs, no next/image loader configured yet
        <img
          src={b.logoUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5 text-lg dark:bg-white/5"
        >
          🎲
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{b.name}</span>
        <span className="text-xs text-zinc-500">{formatMeta(b)}</span>
      </div>
      <Link
        href={`/boardgames/${b.id}/configs`}
        aria-label={`Configurations de ${b.name}`}
        title="Configurations"
        className={iconButtonClass}
      >
        <SlidersIcon />
      </Link>
      <button
        type="button"
        onClick={() => onEdit(b)}
        aria-label={`Modifier ${b.name}`}
        title="Modifier"
        className={iconButtonClass}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={() => onToggle(b)}
        aria-label={`${actionLabel} ${b.name}`}
        title={actionLabel}
        className={iconButtonClass}
      >
        {dimmed ? <EyeIcon /> : <EyeOffIcon />}
      </button>
      <button
        type="button"
        onClick={() => onDelete(b)}
        aria-label={`Supprimer ${b.name}`}
        title="Supprimer"
        className={dangerIconButtonClass}
      >
        <TrashIcon />
      </button>
    </li>
  );
}
