import Link from "next/link";

import { ChevronRightIcon, PlayIcon } from "@/components/icons";

export interface OngoingGame {
  id: string;
  /** « Catan · Tour 7 » */
  title: string;
  /** Who is at the table. */
  players: string;
}

/**
 * A game still on the table, one tap from being picked back up. The latest
 * one is `featured`: it is the one the table most likely just left.
 */
export function OngoingGameCard({
  game,
  featured,
}: Readonly<{ game: OngoingGame; featured: boolean }>) {
  if (featured) {
    return (
      <Link
        href={`/games/${game.id}/play`}
        className="flex items-center gap-3 rounded-2xl bg-indigo-600 p-4 text-white transition hover:bg-indigo-500"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-lg font-semibold">{game.title}</span>
          <span className="truncate text-sm text-indigo-100">
            {game.players}
          </span>
        </span>
        <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-semibold text-indigo-900">
          <PlayIcon className="h-3.5 w-3.5" />
          Reprendre
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/games/${game.id}/play`}
      className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 transition hover:border-indigo-400 dark:border-indigo-500/30 dark:bg-indigo-500/10"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-semibold">{game.title}</span>
        <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
          {game.players}
        </span>
      </span>
      <ChevronRightIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
    </Link>
  );
}
