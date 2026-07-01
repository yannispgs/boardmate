import type { PlayerTimeStats } from "@/lib/game/stats";

import { PlayerStatCard } from "./PlayerStatCard";

/** The per-player time breakdown, in the pre-sorted order from `computeGameStats`. */
export function PlayerStatCardList({
  players,
  scaleS,
}: {
  players: PlayerTimeStats[];
  scaleS: number;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {players.map((stat, i) => (
        <PlayerStatCard
          key={stat.playerId}
          stat={stat}
          rank={i + 1}
          scaleS={scaleS}
        />
      ))}
    </ul>
  );
}
