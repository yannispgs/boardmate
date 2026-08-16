import type { PlayerId } from "@/lib/domain";
import type { TallyExitLabels } from "@/lib/game/tally-labels";
import type { TallyPlayerStat } from "@/lib/game/tally-stats";

import { TallyPlayerCard } from "./TallyPlayerCard";

/**
 * The per-player manche breakdown, in the order `computeTallyStats` ranked them
 * — most manches taken at 0 first.
 */
export function TallyPlayerCardList({
  players,
  labels,
  stageCount,
  winnerIds,
}: Readonly<{
  players: TallyPlayerStat[];
  labels: TallyExitLabels;
  stageCount: number;
  winnerIds: PlayerId[];
}>) {
  return (
    <ul className="flex flex-col gap-4">
      {players.map((stat, i) => (
        <TallyPlayerCard
          key={stat.playerId}
          stat={stat}
          labels={labels}
          rank={i + 1}
          stageCount={stageCount}
          isWinner={winnerIds.includes(stat.playerId)}
        />
      ))}
    </ul>
  );
}
