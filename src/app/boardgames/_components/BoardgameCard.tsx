"use client";

import Link from "next/link";

import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { iconButtonClass } from "@/components/ui";
import type { Boardgame } from "@/lib/domain";

/**
 * One-line summary of a boardgame's player range and duration. The tags are
 * left out on purpose: they are unbounded, so on a phone they turned the line
 * into a paragraph and pushed the game's own name out of the row. They stay
 * editable in the game's settings.
 */
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

  return parts.join(" · ") || "Aucune info";
}

/**
 * A single boardgame row: logo, name + meta, and the one action that belongs to
 * the list itself — hiding a game from the selections, or bringing it back.
 * Everything else about a game (its settings, extensions, records, FAQ) lives
 * on the game's own page, which the row opens: six side doors on one row left
 * no width for the name of the game they were about.
 */
export function BoardgameCard({
  boardgame: b,
  onToggle,
  actionLabel,
  dimmed = false,
}: Readonly<{
  boardgame: Boardgame;
  onToggle: (b: Boardgame) => void;
  actionLabel: string;
  dimmed?: boolean;
}>) {
  return (
    <li
      className={`flex items-center gap-2 rounded-xl border border-black/10 bg-white pr-3 dark:border-white/10 dark:bg-zinc-900 ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      {/* The row is the link, minus the button beside it: a control nested in a
          link is a mis-tap waiting to happen on a phone. */}
      <Link
        href={`/boardgames/${b.id}/edit`}
        aria-label={b.name}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
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
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{b.name}</span>
          <span className="truncate text-xs text-zinc-500">
            {formatMeta(b)}
          </span>
        </div>
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
    </li>
  );
}
