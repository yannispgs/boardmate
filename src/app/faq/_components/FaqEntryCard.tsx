"use client";

import { FaqQuestion } from "@/components/FaqQuestion";
import { ChevronRightIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { dangerIconButtonClass, iconButtonClass } from "@/components/ui";
import type { FaqEntry } from "@/lib/domain";

/**
 * A question of the FAQ screen: the card everyone reads, plus what only this
 * screen may do to it — move it in the reading order, reword it, remove it.
 * The buttons sit inside the unfolded card, next to the answer they act on.
 */
export function FaqEntryCard({
  entry,
  onEdit,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
}: Readonly<{
  entry: FaqEntry;
  onEdit: (entry: FaqEntry) => void;
  onDelete: (entry: FaqEntry) => void;
  /** Left out while searching: an order only means something inside a section. */
  onMove?: (entry: FaqEntry, direction: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}>) {
  return (
    <FaqQuestion
      entry={entry}
      actions={
        <div className="flex items-center gap-1.5">
          {onMove === undefined ? null : (
            <>
              <button
                type="button"
                onClick={() => onMove(entry, "up")}
                disabled={!canMoveUp}
                title="Monter"
                className={`${iconButtonClass} disabled:opacity-30`}
              >
                <ChevronRightIcon className="h-4 w-4 -rotate-90" />
              </button>

              <button
                type="button"
                onClick={() => onMove(entry, "down")}
                disabled={!canMoveDown}
                title="Descendre"
                className={`${iconButtonClass} disabled:opacity-30`}
              >
                <ChevronRightIcon className="h-4 w-4 rotate-90" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onEdit(entry)}
            title="Modifier"
            className={`${iconButtonClass} ml-auto`}
          >
            <PencilIcon />
          </button>

          <button
            type="button"
            onClick={() => onDelete(entry)}
            title="Supprimer"
            className={dangerIconButtonClass}
          >
            <TrashIcon />
          </button>
        </div>
      }
    />
  );
}
