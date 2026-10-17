import Link from "next/link";

export interface RecentGame {
  id: string;
  name: string;
  /** Who won, and when — « Yannou · 12 oct. ». */
  detail: string;
}

/** A game recently finished, opening on its final screen. */
export function RecentGameCard({ game }: Readonly<{ game: RecentGame }>) {
  return (
    <Link
      href={`/games/${game.id}/play`}
      className="flex items-center justify-between gap-3 border-black/5 border-b px-4 py-3 text-sm transition last:border-b-0 hover:bg-black/5 dark:border-white/5 dark:hover:bg-white/5"
    >
      <span className="truncate">{game.name}</span>
      <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
        {game.detail}
      </span>
    </Link>
  );
}
