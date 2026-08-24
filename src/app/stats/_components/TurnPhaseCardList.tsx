import type { TurnPhaseStat } from "@/lib/game/phase-stats";
import { TurnPhaseCard } from "./TurnPhaseCard";

/** Every game played in phases this player has taken a turn in. */
export function TurnPhaseCardList({
  stats,
}: Readonly<{ stats: readonly TurnPhaseStat[] }>) {
  return (
    <ul className="flex flex-col gap-2">
      {stats.map(stat => (
        <TurnPhaseCard key={stat.boardgameId} stat={stat} />
      ))}
    </ul>
  );
}
