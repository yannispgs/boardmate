import type { TallyExitStat } from "@/lib/game/tally-averages";

import { TallyExitCard } from "./TallyExitCard";

/**
 * Who goes out most often, in the order `computeTallyExits` ranked them.
 * Renders nothing when the parties in scope recorded no manche.
 */
export function TallyExitCardList({
  stats,
}: Readonly<{ stats: TallyExitStat[] }>) {
  if (stats.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-4">
      {stats.map((stat, i) => (
        <TallyExitCard key={stat.playerId} stat={stat} rank={i + 1} />
      ))}
    </ul>
  );
}
