import type { TallyExitStat } from "@/lib/game/tally-averages";
import type { TallyExitLabels } from "@/lib/game/tally-labels";

import { TallyExitCard } from "./TallyExitCard";

/**
 * Who ends a manche at 0 most often, in the order `computeTallyExits` ranked
 * them. Renders nothing when the parties in scope recorded no manche.
 */
export function TallyExitCardList({
  stats,
  labels,
}: Readonly<{ stats: TallyExitStat[]; labels: TallyExitLabels }>) {
  if (stats.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-4">
      {stats.map((stat, i) => (
        <TallyExitCard
          key={stat.playerId}
          stat={stat}
          labels={labels}
          rank={i + 1}
        />
      ))}
    </ul>
  );
}
