import type { PlayerId } from "@/lib/domain";
import type { PlayerAggregate } from "@/lib/game/global-stats";
import { PlayerRankingRow } from "./PlayerRankingRow";

/** The player leaderboard: ranked rows, best win rate first, tap for detail. */
export function PlayerRankingList({
  players,
  onSelect,
}: {
  players: PlayerAggregate[];
  onSelect: (id: PlayerId) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {players.map((player, i) => (
        <PlayerRankingRow
          key={player.playerId}
          rank={i + 1}
          player={player}
          onSelect={() => onSelect(player.playerId)}
        />
      ))}
    </ul>
  );
}
