import type { WorstScore } from "@/lib/game/worst-scores";

import { WorstScoreRow } from "./WorstScoreRow";

/**
 * One podium of scores, worst first. No frame around it: the section's title
 * and its two selectors already say what is being read, and a card would put a
 * second border inside a block that has one.
 */
export function WorstScoreList({
  scores,
}: Readonly<{ scores: readonly WorstScore[] }>) {
  if (scores.length === 0) {
    return null;
  }

  return (
    <ol
      data-testid="worst-scores"
      className="divide-y divide-black/5 overflow-hidden rounded-xl border border-black/10 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-zinc-900"
    >
      {scores.map((score, i) => (
        <WorstScoreRow
          key={`${score.playerId}-${score.endedAt}-${score.score}`}
          score={score}
          rank={i + 1}
        />
      ))}
    </ol>
  );
}
