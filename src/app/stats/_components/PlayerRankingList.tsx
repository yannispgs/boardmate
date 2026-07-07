import type { PlayerAggregate } from "@/lib/game/global-stats";
import { PlayerRankingRow } from "./PlayerRankingRow";

/** The player leaderboard: ranked rows, best win rate first. */
export function PlayerRankingList({ players }: { players: PlayerAggregate[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {players.map((player, i) => (
        <PlayerRankingRow key={player.playerId} rank={i + 1} player={player} />
      ))}
    </ul>
  );
}
