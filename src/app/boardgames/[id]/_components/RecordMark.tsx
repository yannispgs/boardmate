"use client";

import type { RecordEntry } from "@/lib/game/record-board";
import { targetShort } from "@/lib/game/record-board";

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
 * One mark inside a table size: the finish line it was set against on the left
 * rail, who holds it in the middle, what it is worth on the right.
 *
 * The finish line sits on a rail of its own rather than under the holder, so
 * the two figures of a race — the target and the laps it took — read as two
 * columns instead of one stacked pair. The scenario stays under the name: it is
 * a name too, and it would break the rail's alignment.
 */
export function RecordMark({
  entry,
  onOpen,
}: Readonly<{ entry: RecordEntry; onOpen: () => void }>) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
      >
        <span className="w-9 shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {entry.target === null ? "" : targetShort(entry.target)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">
            {entry.holders.join(", ")}
          </span>
          {entry.label === null ? null : (
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {entry.label}
            </span>
          )}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          <span aria-hidden>{SIGIL[entry.metric]}</span> {figure(entry)}
        </span>
      </button>
    </li>
  );
}
