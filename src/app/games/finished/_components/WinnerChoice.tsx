"use client";

import type { Player, PlayerId } from "@/lib/domain";

/**
 * Who takes the game, asked only when it is genuinely open: an unscored game
 * (nothing to read a winner from) or a tie at the top. Several names selected
 * means a shared victory.
 */
export function WinnerChoice({
  candidates,
  winners,
  scored,
  onToggle,
}: Readonly<{
  candidates: Player[];
  winners: PlayerId[];
  /** Whether the tie is on a score — an unscored game has no tie to explain. */
  scored: boolean;
  onToggle: (id: PlayerId) => void;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {winners.length > 1 ? "Vainqueurs" : "Vainqueur"}
        {scored ? (
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            {" "}
            · égalité au score
          </span>
        ) : null}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        Plusieurs noms = victoire partagée.
      </span>
      {candidates.map(p => {
        const isWinner = winners.includes(p.id);

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
              isWinner
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            }`}
          >
            <span>{p.name}</span>
            {isWinner ? <span aria-hidden>🏆</span> : null}
          </button>
        );
      })}
    </div>
  );
}
