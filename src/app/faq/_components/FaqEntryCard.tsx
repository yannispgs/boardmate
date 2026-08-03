"use client";

import { ChevronRightIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { dangerIconButtonClass, iconButtonClass } from "@/components/ui";
import type { FaqEntry } from "@/lib/domain";

/**
 * One question, closed until it is asked. The answer and the buttons acting on
 * it appear together when the card unfolds: on a phone there is no hovering to
 * reveal them with, and a list of questions is easier to run down when nothing
 * but the questions is on screen.
 *
 * The answer is rendered as plain text (`whitespace-pre-wrap` keeps the line
 * breaks) — never as HTML. It is stored exactly as it was typed, so anything
 * else would turn the FAQ into a stored-XSS vector.
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
    <li className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-2 p-3">
          <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
          <span className="flex-1 text-sm font-medium">{entry.question}</span>
        </summary>

        <div className="flex flex-col gap-3 border-t border-black/5 px-3 py-3 dark:border-white/10">
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">
            {entry.answer}
          </p>

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
        </div>
      </details>
    </li>
  );
}
