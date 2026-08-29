"use client";

import type { BoardLine, BoardRow, RecordEntry } from "@/lib/game/record-board";

/** The sign each kind of mark is worn under, the same two as the end screen. */
const SIGIL: Readonly<Record<RecordEntry["metric"], string>> = {
  score: "⭐",
  speed: "⚡",
};

/** The figure spelled out in the unit it was measured in. */
function figure(entry: RecordEntry): string {
  if (entry.metric === "score") {
    return `${entry.value} points`;
  }

  return `${entry.value} ${entry.value > 1 ? "tours" : "tour"}`;
}

/**
 * One mark of the board, as a line rather than a card: the table size on the
 * left, who holds it in the middle, what it is worth on the right.
 *
 * A frame per table size meant a border, a background and a header line spent
 * on a single figure, five or six times down a phone screen. The rule between
 * the lines tells them apart just as well, and the three columns line up down
 * the page — which is how a grid of records is read, by running an eye down the
 * right-hand column, not box by box.
 *
 * The size column only appears on a game whose scale moves with the table
 * ({@link BoardLine}'s row carries a `playerCount` of `null` otherwise): on the
 * others there is one line per mark and nothing to tell apart, so the column
 * would cost a quarter of the width to repeat « Toutes tailles ».
 */
export function RecordRow({
  line,
  onOpen,
}: Readonly<{
  line: BoardLine;
  onOpen: (row: BoardRow, entry: RecordEntry) => void;
}>) {
  const { row, entry } = line;
  const size =
    row.playerCount === null ? null : (
      <span className="w-24 shrink-0 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
        {row.label}
      </span>
    );

  if (entry === null) {
    return (
      <li className="flex items-baseline gap-3 py-2.5">
        {size}
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-400 dark:text-zinc-500">
          Non attribué
        </span>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(row, entry)}
        className="-mx-2 flex w-[calc(100%+1rem)] items-baseline gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
      >
        {size}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">
            {entry.holders.join(", ")}
          </span>
          {entry.label === null ? null : (
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {entry.label}
            </span>
          )}
        </span>
        <span className="shrink-0 font-semibold tabular-nums">
          <span aria-hidden>{SIGIL[entry.metric]}</span> {figure(entry)}
        </span>
      </button>
    </li>
  );
}
