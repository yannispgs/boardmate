import type { ReactNode } from "react";

/**
 * The top row of a modal card: what it is, and the way out. Every sheet in the
 * app opens on that same row, so it is written once here — a title, a word of
 * context under it, a badge beside it, and « Fermer ».
 *
 * `relative z-10` keeps the row above anything the body positions absolutely
 * (the carousel's arrows), which would otherwise paint over the close button.
 */
export function ModalHeader({
  title,
  hint,
  badge,
  action,
  onClose,
}: Readonly<{
  title: string;
  /** A line under the title: what the list is narrowed to, how long it is… */
  hint?: ReactNode;
  /** A pill between the title and « Fermer » — a position in a deck, say. */
  badge?: string;
  /** A control of the sheet's own, sitting just before « Fermer ». */
  action?: ReactNode;
  onClose: () => void;
}>) {
  return (
    <div className="relative z-10 flex items-center justify-between gap-3 border-b border-black/10 p-4 dark:border-white/10">
      <div className="flex min-w-0 flex-col">
        <h2 className="text-base font-semibold">{title}</h2>

        {hint === undefined ? null : (
          <span className="text-xs text-zinc-500">{hint}</span>
        )}
      </div>

      {badge === undefined ? null : (
        <span className="shrink-0 rounded-full bg-indigo-600/10 px-3 py-1 text-sm font-semibold tabular-nums text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300">
          {badge}
        </span>
      )}

      {action}

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg border border-black/10 px-3 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
      >
        Fermer
      </button>
    </div>
  );
}
