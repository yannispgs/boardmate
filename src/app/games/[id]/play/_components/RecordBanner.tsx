import type { ScoreRecord } from "@/lib/game/score-records";
import { recordTitle } from "@/lib/game/score-records";

/**
 * The one thing a party leaves behind that outlives it, said out loud under the
 * winner: the game's record has changed hands. Only the game's — a personal
 * best is read on the score sheet, line by line, because on a table of five
 * newcomers nearly everyone beats his own and the record would drown in them.
 *
 * Nothing is shown when no record was taken, which is nearly every party.
 */
export function RecordBanner({
  record,
  score,
}: Readonly<{ record: ScoreRecord | null; score: number | null }>) {
  if (record === null || score === null) {
    return null;
  }

  return (
    <p className="mt-2 flex flex-col items-center gap-0.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-2">
      <span className="font-semibold text-amber-700 dark:text-amber-300">
        {`⭐ ${recordTitle(record)} battu !`}
      </span>
      <span className="text-sm text-amber-700/80 dark:text-amber-300/80">
        {`${score} pts — ancien record : ${record.previous}`}
      </span>
    </p>
  );
}
