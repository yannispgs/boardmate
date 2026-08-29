"use client";

import type { BoardRow, RecordEntry } from "@/lib/game/record-board";
import { sizeShort } from "@/lib/game/record-board";
import { RecordMark } from "./RecordMark";

/**
 * One table size of the board, and every mark standing at it — the size said
 * once, on the left, however many marks hang off it. A raced game sets one per
 * finish line, and repeating « 3 joueurs » above each of them would say three
 * times what the group already says once.
 *
 * A size nobody has played yet says so out loud: an empty group is what is left
 * to take, which is the whole reason the grid enumerates sizes rather than
 * listing the parties played.
 */
export function RecordRow({
  row,
  onOpen,
}: Readonly<{
  row: BoardRow;
  onOpen: (entry: RecordEntry) => void;
}>) {
  return (
    <li className="flex items-start gap-2 py-1.5">
      {row.playerCount === null ? null : (
        <span className="w-8 shrink-0 px-2 py-1.5 text-sm font-semibold tabular-nums">
          {sizeShort(row.playerCount)}
        </span>
      )}

      {row.entries.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-zinc-400 dark:text-zinc-500">
          Non attribué
        </p>
      ) : (
        <ul className="flex min-w-0 flex-1 flex-col divide-y divide-black/5 dark:divide-white/5">
          {row.entries.map(entry => (
            <RecordMark
              key={entry.key}
              entry={entry}
              onOpen={() => onOpen(entry)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
