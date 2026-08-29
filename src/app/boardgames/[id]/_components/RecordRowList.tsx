"use client";

import type { BoardRow, RecordEntry } from "@/lib/game/record-board";
import { RecordRow } from "./RecordRow";

/**
 * The table sizes of the tab in view, one group each. The rule between two
 * sizes is heavier than the one between two marks of the same size: they are
 * the cuts that matter — a mark only ever compares to the others under the same
 * heading, and the eye has to find that boundary without reading the labels.
 */
export function RecordRowList({
  rows,
  onOpen,
}: Readonly<{
  rows: BoardRow[];
  onOpen: (row: BoardRow, entry: RecordEntry) => void;
}>) {
  return (
    <ul className="flex flex-col divide-y divide-black/15 dark:divide-white/15">
      {rows.map(row => (
        <RecordRow
          key={row.label}
          row={row}
          onOpen={entry => onOpen(row, entry)}
        />
      ))}
    </ul>
  );
}
