import type { ScoreRecord } from "@/lib/game/score-records";
import { recordLabel, recordTitle } from "@/lib/game/score-records";

/**
 * One record worn next to a player's score: `PB` for his own best, `WR` for the
 * game's, each carrying the table size on a game whose scores only compare
 * between tables of the same size (`WR4`).
 */
export function RecordBadge({ record }: Readonly<{ record: ScoreRecord }>) {
  const own = record.kind === "personal";

  return (
    <span
      title={recordTitle(record)}
      className={`rounded px-1.5 py-0.5 text-[0.625rem] font-bold uppercase leading-none tracking-wide ${
        own
          ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
          : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
      }`}
    >
      {recordLabel(record)}
    </span>
  );
}
