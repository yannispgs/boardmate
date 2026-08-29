import type { NeighbourStat } from "@/lib/game/neighbour-stats";

import { NeighbourCard } from "./NeighbourCard";

/**
 * Every player the game has seen enough of, heaviest neighbour first — the
 * order `computeNeighbourStats` ranked them in, which is the order the argument
 * is had in.
 */
export function NeighbourCardList({
  stats,
  pileAverage,
  onOpen,
}: Readonly<{
  stats: NeighbourStat[];
  pileAverage: number | null;
  onOpen: (stat: NeighbourStat) => void;
}>) {
  return (
    <ul className="flex flex-col gap-2">
      {stats.map(stat => (
        <NeighbourCard
          key={stat.playerId}
          stat={stat}
          pileAverage={pileAverage}
          onOpen={() => onOpen(stat)}
        />
      ))}
    </ul>
  );
}
