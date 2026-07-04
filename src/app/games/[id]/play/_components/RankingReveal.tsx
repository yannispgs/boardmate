"use client";

import { useState } from "react";

import type { PlayerId } from "@/lib/domain";
import type { Ranked } from "@/lib/game/scoring";

/**
 * Suspense reveal of the final standings: starts on the last place and steps up
 * one player at a time to the winner. Newly revealed players stack from the
 * bottom, so the winner lands last, at the top. "Voir les scores" continues once
 * everyone is out.
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
  const [shown, setShown] = useState(1);

  const nameOf = (id: PlayerId) => players.find(p => p.id === id)?.name ?? "?";
  const done = shown >= worstFirst.length;
  // Revealed so far, shown best-first (so the winner rises to the top last).
  const revealed = worstFirst.slice(0, shown);
  const displayed = [...revealed].sort((a, b) => a.rank - b.rank);
  const latest = worstFirst[shown - 1];

  return (
    <div className="flex min-h-[calc(100lvh-6rem)] flex-col items-center justify-center gap-8 py-8">
      <h2 className="text-center text-lg font-semibold uppercase tracking-wide text-zinc-400">
        Classement final
      </h2>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        {done
          ? "🏆 Et le vainqueur est…"
          : `${latest.rank}ᵉ place · ${nameOf(latest.playerId)}`}
      </p>

      <ol className="flex w-full max-w-xs flex-col gap-2">
        {displayed.map(r => {
          const isWinner = r.rank === 1;
          const isLatest = r.playerId === latest.playerId;

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
        {done ? "Voir les scores" : "Suivant"}
      </button>
    </div>
  );
}
