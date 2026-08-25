import type { SessionPlayerStat } from "@/lib/game/session-stats";

import { SessionPlayerCard } from "./SessionPlayerCard";

/**
 * The sitting's players, best first — fed by {@link sessionStanding}, so the
 * order is already most wins then best average place.
 */
export function SessionPlayerCardList({
  stats,
}: Readonly<{ stats: readonly SessionPlayerStat[] }>) {
  return (
    <ul
      aria-label="Classement de la soirée"
      className="flex w-full flex-col gap-2"
    >
      {stats.map(stat => (
        <SessionPlayerCard key={stat.playerId} stat={stat} />
      ))}
    </ul>
  );
}
