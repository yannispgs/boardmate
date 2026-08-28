"use client";

import type { BoardRow, RecordEntry } from "@/lib/game/record-board";

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

/** One mark of a row: what it is, what it is worth, and who holds it. */
function EntryLine({
  entry,
  onOpen,
}: Readonly<{ entry: RecordEntry; onOpen: () => void }>) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
    >
      <span aria-hidden>{SIGIL[entry.metric]}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        {entry.label === null ? null : (
          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {entry.label}
          </span>
        )}
        <span className="truncate font-medium">{entry.holders.join(", ")}</span>
      </span>
      <span className="shrink-0 font-semibold tabular-nums">
        {figure(entry)}
      </span>
    </button>
  );
}

/**
 * One line of the board: a table size, and every mark standing at it. A size
 * nobody has played yet says so out loud — an empty cell is what is left to
 * take, which is the whole reason the grid enumerates sizes rather than listing
 * the parties played.
 */
export function RecordRow({
  row,
  onOpen,
}: Readonly<{
  row: BoardRow;
  onOpen: (entry: RecordEntry) => void;
}>) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{row.label}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {row.parties} partie{row.parties > 1 ? "s" : ""}
        </span>
      </div>

      {row.entries.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Non attribué
        </p>
      ) : (
        row.entries.map(entry => (
          <EntryLine
            key={entry.key}
            entry={entry}
            onOpen={() => onOpen(entry)}
          />
        ))
      )}
    </li>
  );
}
