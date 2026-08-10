import type { PlayerAggregate } from "@/lib/game/global-stats";
import { GamePlayerRow } from "./GamePlayerRow";

/**
 * The per-player table for a single game: each player's record on that game
 * (over the selected parties). `scored` hides the score column for games that
 * don't keep one.
 */
export function GamePlayerTable({
  players,
  scored,
}: Readonly<{
  players: PlayerAggregate[];
  scored: boolean;
}>) {
  return (
    <ul className="flex flex-col gap-3">
      {players.map((player, i) => (
        <GamePlayerRow
          key={player.playerId}
          rank={i + 1}
          player={player}
          scored={scored}
        />
      ))}
    </ul>
  );
}
