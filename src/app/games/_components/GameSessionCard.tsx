"use client";

import type { ReactNode } from "react";

import { ChevronRightIcon } from "@/components/icons";
import type { GameListItem } from "@/lib/domain";

/**
 * A sitting, folded into one row of the list: the parties dealt one after
 * another from the same score sheet, opened on demand.
 *
 * It exists because a Papayoo evening reaches « Parties » as a dozen lines that
 * say the same thing, burying every other game of the week under it. The row
 * says how many parties the evening was and when it happened, and nothing else:
 * a session has no winner and no cumulative score, so the parties inside keep
 * counting for themselves — here and in the statistics alike.
 */
export function GameSessionCard({
  games,
  boardgameName,
  logoUrl,
  ended = false,
  children,
}: Readonly<{
  /** The parties of the sitting, in the order the list gave them. */
  games: GameListItem[];
  boardgameName: string;
  logoUrl: string | null;
  ended?: boolean;
  /** The cards of those same parties, rendered by the list. */
  children: ReactNode;
}>) {
  // The evening is filed under the party it opened with, whatever order the
  // list happens to read in — ISO instants compare as text.
  const opened = games.reduce(
    (earliest, game) => (game.startedAt < earliest ? game.startedAt : earliest),
    games[0].startedAt,
  );

  return (
    <li>
      <details className="group">
        <summary
          className={`flex cursor-pointer list-none items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-indigo-400 dark:border-white/10 dark:bg-zinc-900 ${
            ended ? "opacity-60" : ""
          }`}
        >
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
          {logoUrl ? (
            // biome-ignore lint/performance/noImgElement: arbitrary Storage URLs, no next/image loader configured yet
            <img
              src={logoUrl}
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
            <span className="truncate font-medium">{boardgameName}</span>
            <span className="mt-0.5 text-xs text-zinc-500">
              {games.length} parties ·{" "}
              {new Date(opened).toLocaleDateString("fr-FR")}
            </span>
          </div>
        </summary>
        <ul className="mt-2 flex flex-col gap-2 border-l border-black/10 pl-3 dark:border-white/10">
          {children}
        </ul>
      </details>
    </li>
  );
}
