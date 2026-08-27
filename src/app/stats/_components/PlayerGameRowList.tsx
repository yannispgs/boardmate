import type { BoardgameId } from "@/lib/domain";
import type { GameBreakdown } from "@/lib/game/global-stats";

import { PlayerGameRow } from "./PlayerGameRow";

/**
 * A player's whole record, one thin line per game, most played first. A hair
 * rule between the lines rather than a frame around each: with a dozen games
 * the list is read by running down it, not box by box.
 */
export function PlayerGameRowList({
  games,
  timedGames,
}: Readonly<{
  games: readonly GameBreakdown[];
  /** Games that attribute the time they record to a single player. */
  timedGames: ReadonlySet<BoardgameId>;
}>) {
  return (
    <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
      {games.map(game => (
        <PlayerGameRow
          key={game.boardgameId}
          game={game}
          timed={timedGames.has(game.boardgameId)}
        />
      ))}
    </ul>
  );
}
