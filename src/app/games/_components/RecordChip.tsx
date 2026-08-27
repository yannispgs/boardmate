"use client";

import type { ScoreRecord } from "@/lib/game/score-records";
import { recordLabel, recordTitle } from "@/lib/game/score-records";

/**
 * The mark of the party that **holds** a game's record, worn next to the game's
 * name. One party per game wears it — the best score nobody has beaten yet, or
 * one per table size on a game whose scores only compare between equal tables.
 *
 * Shared by the card of a lone party and by the row of a sitting, so a folded
 * evening says it holds a record without having to be opened.
 */
export function RecordChip({
  record,
}: Readonly<{ record: ScoreRecord | null }>) {
  if (record === null) {
    return null;
  }

  return (
    <span
      title={recordTitle(record)}
      className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
    >
      {`⭐ ${recordLabel(record)}`}
    </span>
  );
}
