import { type OngoingGame, OngoingGameCard } from "./OngoingGameCard";

/** The games still running, the most recent first and set apart. */
export function OngoingGameCardList({
  games,
}: Readonly<{ games: readonly OngoingGame[] }>) {
  return (
    <div className="flex flex-col gap-2">
      {games.map((game, index) => (
        <OngoingGameCard key={game.id} game={game} featured={index === 0} />
      ))}
    </div>
  );
}
