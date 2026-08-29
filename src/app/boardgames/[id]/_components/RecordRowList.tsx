"use client";

import type { BoardLine, BoardRow, RecordEntry } from "@/lib/game/record-board";
import { RecordRow } from "./RecordRow";

/**
 * The lines of the tab in view. A hair rule between them rather than a frame
 * around each: the grid is read by running down it, and a game declared 2–6
 * would otherwise stack five boxes to show five figures.
 */
export function RecordRowList({
  lines,
  onOpen,
}: Readonly<{
  lines: BoardLine[];
  onOpen: (row: BoardRow, entry: RecordEntry) => void;
}>) {
  return (
    <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
      {lines.map(line => (
        <RecordRow key={line.key} line={line} onOpen={onOpen} />
      ))}
    </ul>
  );
}
