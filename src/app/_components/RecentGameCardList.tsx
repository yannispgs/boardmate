import { type RecentGame, RecentGameCard } from "./RecentGameCard";

/** The last few finished games, as one rounded list. */
export function RecentGameCardList({
  games,
}: Readonly<{ games: readonly RecentGame[] }>) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
      {games.map(game => (
        <RecentGameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
