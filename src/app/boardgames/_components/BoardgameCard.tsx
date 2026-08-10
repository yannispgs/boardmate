"use client";

import Link from "next/link";

import {
  EyeIcon,
  EyeOffIcon,
  HelpIcon,
  PuzzleIcon,
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
 * A single boardgame row: logo, name + meta, and the extensions / FAQ / edit /
 * deactivate / delete actions. Whether it's an active or deactivated
 * game is just the `dimmed` + `actionLabel` inputs; the extensions shortcut
 * only shows for a game that actually has some.
 */
export function BoardgameCard({
  boardgame: b,
  onToggle,
  onDelete,
  actionLabel,
  dimmed = false,
  hasExtensions = false,
}: Readonly<{
  boardgame: Boardgame;
  onToggle: (b: Boardgame) => void;
  onDelete: (b: Boardgame) => void;
  actionLabel: string;
  dimmed?: boolean;
  hasExtensions?: boolean;
}>) {
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
      {hasExtensions ? (
        <Link
          href={`/boardgames/${b.id}/extensions`}
          aria-label={`Extensions de ${b.name}`}
          title="Extensions"
          className={iconButtonClass}
        >
          <PuzzleIcon />
        </Link>
      ) : null}
      <Link
        href={`/faq?jeu=${b.id}`}
        aria-label={`FAQ de ${b.name}`}
        title="FAQ"
        className={iconButtonClass}
      >
        <HelpIcon />
      </Link>
      <Link
        href={`/boardgames/${b.id}/edit`}
        aria-label={`Réglages de ${b.name}`}
        title="Réglages"
        className={iconButtonClass}
      >
        <SlidersIcon />
      </Link>
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
