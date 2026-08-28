"use client";

import type { BoardRow, RecordEntry } from "@/lib/game/record-board";
import { RecordRow } from "./RecordRow";

/** The rows of the tab in view, one table size each. */
export function RecordRowList({
  rows,
  onOpen,
}: Readonly<{
  rows: BoardRow[];
  onOpen: (row: BoardRow, entry: RecordEntry) => void;
}>) {
  return (
    <ul className="flex flex-col gap-2">
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
