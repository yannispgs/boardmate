import type { BetPlayerStat } from "@/lib/game/bet-stats";

import { BetPlayerCard } from "./BetPlayerCard";

/** The players' ways of betting, the most reliable first. */
export function BetPlayerCardList({
  stats,
  hedgeLabel,
}: Readonly<{ stats: readonly BetPlayerStat[]; hedgeLabel: string }>) {
  return (
    <ul data-testid="bet-players" className="flex flex-col gap-4">
      {stats.map((stat, i) => (
        <BetPlayerCard
          key={stat.playerId}
          stat={stat}
          rank={i + 1}
          hedgeLabel={hedgeLabel}
        />
      ))}
    </ul>
  );
}
