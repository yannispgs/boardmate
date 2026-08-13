"use client";

import type { Boardgame } from "@/lib/domain";

/**
 * Which game the night was: the first thing asked, since everything else the
 * form shows — the sheet, the extensions, the manches — hangs off it.
 *
 * Only the games still played and actually scored against each other are
 * offered: a co-operative box has no result to record here.
 */
export function BoardgamePicker({
  boardgames,
  selected,
  className,
  onPick,
}: Readonly<{
  boardgames: Boardgame[];
  selected: Boardgame | null;
  className: string;
  onPick: (boardgame: Boardgame) => void;
}>) {
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold">Jeu</h2>
      <div className="flex flex-wrap gap-2">
        {boardgames.map(b => (
          <button
            key={b.id}
            type="button"
            onClick={() => onPick(b)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              selected?.id === b.id
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>
    </section>
  );
}
