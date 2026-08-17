import type { ZeroFinishStat } from "@/lib/game/zero-finishes";

import { ZeroFinishCard } from "./ZeroFinishCard";

/**
 * Who finishes a party at nothing most often, in the order
 * `computeZeroFinishes` ranked them. Renders nothing when the parties in scope
 * recorded no score.
 */
export function ZeroFinishCardList({
  stats,
}: Readonly<{ stats: ZeroFinishStat[] }>) {
  if (stats.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-4">
      {stats.map((stat, i) => (
        <ZeroFinishCard key={stat.playerId} stat={stat} rank={i + 1} />
      ))}
    </ul>
  );
}
