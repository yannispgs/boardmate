"use client";

import { useState } from "react";

import type { PlayerId } from "@/lib/domain";
import type { Ranked } from "@/lib/game/scoring";

/**
 * Suspense reveal of the final standings: opens on an empty board, then steps up
 * one player at a time from the last place to the winner. Newly revealed players
 * stack from the bottom, so the winner lands last, at the top. The button reads
 * "Afficher" for the very first reveal, "Suivant" while climbing, and "Voir les
 * scores" once everyone is out.
 */
export function RankingReveal({
  ranking,
  players,
  onDone,
}: {
  ranking: Ranked[];
  players: { id: PlayerId; name: string }[];
  onDone: () => void;
}) {
  // Reveal worst → best; the array is best-first, so walk it in reverse.
  const worstFirst = [...ranking].reverse();
  // Start at 0: nobody is shown until the first "Afficher".
  const [shown, setShown] = useState(0);

  const nameOf = (id: PlayerId) => players.find(p => p.id === id)?.name ?? "?";
  const done = shown >= worstFirst.length;
  // Revealed so far, shown best-first (so the winner rises to the top last).
  const revealed = worstFirst.slice(0, shown);
  const displayed = [...revealed].sort((a, b) => a.rank - b.rank);
  const latest = shown > 0 ? worstFirst[shown - 1] : null;

  function caption(): string {
    if (shown === 0) {
      return "Du dernier au premier…";
    }
    if (done) {
      return "🏆 Et le vainqueur est…";
    }

    return `${latest?.rank}ᵉ place · ${nameOf((latest as Ranked).playerId)}`;
  }

  return (
    <div className="flex min-h-[calc(100lvh-6rem)] flex-col items-center justify-center gap-8 py-8">
      <h2 className="text-center text-lg font-semibold uppercase tracking-wide text-zinc-400">
        Classement final
      </h2>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        {caption()}
      </p>

      <ol className="flex w-full max-w-xs flex-col gap-2">
        {displayed.map(r => {
          const isWinner = r.rank === 1;
          const isLatest = latest !== null && r.playerId === latest.playerId;

          return (
            <li
              key={r.playerId}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                isWinner && done
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-black/10 dark:border-white/10"
              } ${isLatest ? "ring-1 ring-indigo-400" : ""}`}
            >
              <span className="flex items-center gap-2 font-medium">
                <span className="w-6 text-center tabular-nums text-zinc-400">
                  {r.rank}
                </span>
                {isWinner && done ? "🏆 " : ""}
                {nameOf(r.playerId)}
              </span>
              <span className="font-semibold tabular-nums">{r.total} pts</span>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => (done ? onDone() : setShown(s => s + 1))}
        className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500"
      >
        {done ? "Voir les scores" : shown === 0 ? "Afficher" : "Suivant"}
      </button>
    </div>
  );
}
