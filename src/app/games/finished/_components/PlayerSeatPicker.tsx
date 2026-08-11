"use client";

import type { Player } from "@/lib/domain";

/**
 * Who was at the table, picked in the order they played — the click order is
 * the seat order, and the badge on each name is the seat it earned. That order
 * matters beyond bookkeeping: a game scored on shared piles multiplies the two
 * piles flanking a seat.
 */
export function PlayerSeatPicker({
  className,
  players,
  selected,
  onToggle,
}: Readonly<{
  className: string;
  players: Player[];
  selected: Player[];
  onToggle: (player: Player) => void;
}>) {
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold">
        Joueurs{" "}
        <span className="text-zinc-400">(dans l&apos;ordre de jeu)</span>
      </h2>
      <div className="flex flex-wrap gap-2">
        {players.map(p => {
          const seat = selected.findIndex(s => s.id === p.id);

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                seat >= 0
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              }`}
            >
              {seat >= 0 ? (
                <span className="tabular-nums opacity-80">{seat + 1}.</span>
              ) : null}
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>
      {selected.length < 2 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Sélectionne au moins deux joueurs.
        </p>
      ) : null}
    </section>
  );
}
