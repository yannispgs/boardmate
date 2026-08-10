"use client";

import type { Player, PlayerId } from "@/lib/domain";

/**
 * Simultaneous games: everyone plays at once, so instead of a current player we
 * show "everyone plays" and let you tap **the player the table is waiting on**
 * this round (single choice, tap again to clear). The pick is recorded when the
 * round advances, feeding the end-game "who we waited on most" stat.
 */
export function WaitPicker({
  players,
  value,
  onChange,
}: Readonly<{
  players: Player[];
  value: PlayerId | null;
  onChange: (id: PlayerId | null) => void;
}>) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <p className="text-lg font-semibold">Tout le monde joue</p>
      <p className="text-xs uppercase tracking-wide text-zinc-400">
        On attend qui&nbsp;?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {players.map(p => {
          const picked = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(picked ? null : p.id)}
              aria-pressed={picked}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                picked
                  ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "border-black/10 hover:border-amber-400 dark:border-white/15"
              }`}
            >
              {picked ? "⏳ " : ""}
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
