import type { WorstScore } from "@/lib/game/worst-scores";

/** The day a party ended, in the reader's own calendar. */
function day(endedAt: string | null): string {
  /* c8 ignore next 3 -- defensive: an ended party always carries its date */
  if (endedAt === null) {
    return "";
  }

  return new Date(endedAt).toLocaleDateString("fr-FR");
}

/** One line of the hall of shame: who, how much, and when. */
export function WorstScoreRow({
  score,
  rank,
}: Readonly<{ score: WorstScore; rank: number }>) {
  return (
    <li className="flex items-baseline gap-2 px-3 py-2 text-sm">
      <span className="w-4 text-right text-xs text-zinc-400 tabular-nums">
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate">{score.name}</span>
      <span className="font-semibold tabular-nums">{score.score}</span>
      <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        {day(score.endedAt)}
      </span>
    </li>
  );
}
