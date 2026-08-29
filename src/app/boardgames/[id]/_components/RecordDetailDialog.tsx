"use client";

import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
import { modalCardClass } from "@/components/ui";
import type { BoardRow, RecordEntry } from "@/lib/game/record-board";
import { targetLong } from "@/lib/game/record-board";

/** How a mark reads in the unit it was measured in, in the detail list. */
function figure(entry: RecordEntry, value: number): string {
  if (entry.metric === "score") {
    return `${value} pts`;
  }

  return `${value} ${value > 1 ? "tours" : "tour"}`;
}

/**
 * Everyone's own best inside one cell of the board: the grid says who holds the
 * game's record, this says where each player stands against it — the question
 * the grid alone can't answer, since a record is one figure and a table has
 * several players.
 *
 * A race lists only the players who **won** one: the laps are counted to
 * reaching the target, so a runner-up has no mark of his own to show.
 */
export function RecordDetailDialog({
  row,
  entry,
  tabLabel,
  onClose,
}: Readonly<{
  row: BoardRow;
  entry: RecordEntry;
  tabLabel: string;
  onClose: () => void;
}>) {
  // The configuration said in full, where there is room for it: the grid runs
  // on abbreviations (« 3J », « 15P ») and on a count of parties it dropped
  // with the frame around each table size, and this is the one place both can
  // be read as words — right above the players who played them.
  const played = `${entry.parties} partie${entry.parties > 1 ? "s" : ""}`;
  const hint = [
    tabLabel,
    row.label,
    entry.label,
    entry.target === null ? null : targetLong(entry.target),
    played,
  ]
    .filter(part => part !== null)
    .join(" · ");

  return (
    <Modal onClose={onClose} label="Records par joueur">
      <div className={`${modalCardClass} max-w-md`}>
        <ModalHeader
          title={entry.metric === "score" ? "Meilleurs scores" : "Plus rapides"}
          hint={hint}
          onClose={onClose}
        />

        <ul className="flex flex-col divide-y divide-black/5 overflow-y-auto p-2 dark:divide-white/10">
          {entry.bests.map((best, rank) => (
            <li
              key={best.playerId}
              className="flex items-baseline gap-3 px-2 py-2"
            >
              <span className="w-5 shrink-0 text-sm text-zinc-400 tabular-nums">
                {rank + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {best.name}
              </span>
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {best.parties} partie{best.parties > 1 ? "s" : ""}
              </span>
              <span className="w-20 shrink-0 text-right font-semibold tabular-nums">
                {figure(entry, best.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
