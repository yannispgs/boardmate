import type { WorstScoreGroup } from "@/lib/game/worst-scores";

import { WorstScoreCard } from "./WorstScoreCard";

/**
 * The hall of shame, one block per table size, small tables first. Renders
 * nothing when no party in scope recorded a score.
 */
export function WorstScoreCardList({
  groups,
}: Readonly<{ groups: WorstScoreGroup[] }>) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {groups.map(group => (
        <WorstScoreCard key={group.playerCount} group={group} />
      ))}
    </ul>
  );
}
