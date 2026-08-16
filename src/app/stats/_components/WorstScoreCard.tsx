import type { WorstScoreGroup } from "@/lib/game/worst-scores";

/** The day a party ended, in the reader's own calendar. */
function day(endedAt: string | null): string {
  /* c8 ignore next 3 -- defensive: an ended party always carries its date */
  if (endedAt === null) {
    return "";
  }

  return new Date(endedAt).toLocaleDateString("fr-FR");
}

/**
 * The heaviest scores collected at one table size, worst first.
 *
 * The heading is the table, not the game: 250 points taken at three is a very
 * different evening from 250 taken at six, and putting the two in one list
 * would rank the small tables rather than the players.
 */
export function WorstScoreCard({
  group,
}: Readonly<{ group: WorstScoreGroup }>) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
      <span className="text-sm font-medium">À {group.playerCount} joueurs</span>

      <ol className="flex flex-col gap-1">
        {group.scores.map((score, i) => (
          <li
            key={`${score.playerId}-${score.endedAt}-${score.score}`}
            className="flex items-baseline gap-2 text-sm"
          >
            <span className="text-xs text-zinc-400 tabular-nums">{i + 1}.</span>
            <span className="min-w-0 flex-1 truncate">{score.name}</span>
            <span className="font-semibold tabular-nums">{score.score}</span>
            <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {day(score.endedAt)}
            </span>
          </li>
        ))}
      </ol>
    </li>
  );
}
