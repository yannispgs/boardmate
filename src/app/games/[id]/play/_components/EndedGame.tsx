"use client";

import Link from "next/link";
import { useRef } from "react";

import type { PopulatedGame } from "@/lib/domain";

import { GameStats } from "./GameStats";

/**
 * The finished-game screen: a winner banner filling the view, then the
 * statistics panel below. A button scrolls the stats into view so the reward
 * (who won) stays front and centre while the numbers are one tap away.
 */
export function EndedGame({ game }: { game: PopulatedGame }) {
  const statsRef = useRef<HTMLDivElement>(null);
  const winnerEntry = game.players.find(p => p.isWinner) ?? null;
  const winner = winnerEntry?.player ?? null;
  const winnerScore = winnerEntry?.score ?? null;

  const seeStats = () => {
    statsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col">
      {/* The classic end screen fills one screenful before the stats. Sized to
          the LARGEST viewport (`lvh`, address bar hidden) minus the page header
          + padding (~6rem): hiding the bar can then never reveal the stats
          underneath. The winner owns the centre; the buttons sit lower. */}
      <div className="flex min-h-[calc(100lvh-6rem)] flex-col items-center text-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <span aria-hidden className="text-6xl">
            🏆
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold">Partie terminée !</h2>
            {winner ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                Bravo <span className="font-semibold">{winner.name}</span> 🎉
                {winnerScore !== null ? (
                  <span className="block text-sm">
                    avec {winnerScore} points
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 pb-28">
          <button
            type="button"
            onClick={seeStats}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-black/5 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            Voir les statistiques ↓
          </button>

          <Link
            href="/games"
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
          >
            Retour aux parties
          </Link>
        </div>
      </div>

      <div ref={statsRef} className="scroll-mt-6">
        <GameStats game={game} />
      </div>
    </div>
  );
}
