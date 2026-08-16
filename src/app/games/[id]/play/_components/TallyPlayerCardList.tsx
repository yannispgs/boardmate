import type { PlayerId } from "@/lib/domain";
import type { TallyPlayerStat } from "@/lib/game/tally-stats";

import { TallyPlayerCard } from "./TallyPlayerCard";

/**
 * The per-player manche breakdown, in the order `computeTallyStats` ranked them
 * — most times out first.
 */
export function TallyPlayerCardList({
  players,
  stageCount,
  winnerIds,
}: Readonly<{
  players: TallyPlayerStat[];
  stageCount: number;
  winnerIds: PlayerId[];
}>) {
  return (
    <ul className="flex flex-col gap-4">
      {players.map((stat, i) => (
        <TallyPlayerCard
          key={stat.playerId}
          stat={stat}
          rank={i + 1}
          stageCount={stageCount}
          isWinner={winnerIds.includes(stat.playerId)}
        />
      ))}
    </ul>
  );
}
