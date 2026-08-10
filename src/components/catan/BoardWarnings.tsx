"use client";

import type { BoardWarning } from "@/lib/catan/board";
import { warningText } from "@/lib/catan/warnings";

/**
 * The ⚠️ badge pinned to a generated board's top-right corner, opening the list
 * of soft placement rules it misses. Sits inside the board's relative wrapper.
 */
export function WarningsBadge({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Voir les règles de placement non respectées"
      className="absolute right-0 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-lg shadow ring-1 ring-amber-400 transition hover:bg-amber-200 dark:bg-amber-950 dark:ring-amber-600"
    >
      ⚠️
    </button>
  );
}

/** The rules the generator aimed for but could not satisfy on this board. */
export function BoardWarnings({
  warnings,
  className,
}: Readonly<{
  warnings: BoardWarning[];
  className: string;
}>) {
  return (
    <section
      className={`${className} border-amber-400/60 bg-amber-50 text-sm dark:bg-amber-950/40`}
    >
      <h2 className="font-semibold">⚠️ Règles non garanties sur ce plateau</h2>
      <p className="text-xs text-zinc-600 dark:text-zinc-300">
        Le générateur fait au mieux : ce plateau respecte les contraintes
        strictes, mais pas les règles souples ci-dessous. Retire un nouveau
        plateau pour retenter.
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-zinc-700 dark:text-zinc-200">
        {warnings.map(w => (
          <li key={w.kind === "resourceBalance" ? `bal-${w.resource}` : w.kind}>
            {warningText(w)}
          </li>
        ))}
      </ul>
    </section>
  );
}
