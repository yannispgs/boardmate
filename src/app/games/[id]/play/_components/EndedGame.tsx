"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Drawer } from "@/components/Drawer";
import type { PopulatedGame } from "@/lib/domain";

import { CategoryBreakdownFill } from "./CategoryBreakdownFill";
import { EndScorePanel } from "./EndScorePanel";
import { GameStats } from "./GameStats";

/**
 * The finished-game screen: a winner banner filling the view, then the
 * statistics panel below. A button scrolls the stats into view so the reward
 * (who won) stays front and centre while the numbers are one tap away. A
 * right-edge tab slides in the final score (with the per-category detail for
 * category games), keeping the stats at the bottom and the score on the side.
 */
export function EndedGame({
  game,
  onReload,
}: {
  game: PopulatedGame;
  onReload: () => void;
}) {
  // A category game logged with only a total can be completed with its
  // per-category detail here (e.g. a game added after the fact).
  const canFillBreakdown =
    game.boardgame.scoring?.entry === "categories" &&
    game.players.every(p => p.scoreBreakdown === null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const winnerEntry = game.players.find(p => p.isWinner) ?? null;
  const winner = winnerEntry?.player ?? null;
  const winnerScore = winnerEntry?.score ?? null;

  // Cooperative games have no individual winner: the whole table wins or loses
  // together (every player `isWinner`, or none).
  const coop = game.boardgame.kind === "cooperative";
  const coopWon = game.players.some(p => p.isWinner);

  // The score slide-over only makes sense once someone actually has a score.
  const hasScore = game.players.some(p => p.score !== null);

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
            {coop ? (coopWon ? "🎉" : "😔") : "🏆"}
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold">Partie terminée !</h2>
            {coop ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                {coopWon ? (
                  <span className="font-semibold">Victoire commune 🎉</span>
                ) : (
                  <span className="font-semibold">Défaite 😔</span>
                )}
              </p>
            ) : winner ? (
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

      <div ref={statsRef} className="flex flex-col gap-6 scroll-mt-6">
        {canFillBreakdown ? (
          <CategoryBreakdownFill game={game} onSaved={onReload} />
        ) : null}
        <GameStats game={game} />
      </div>

      {hasScore ? (
        <>
          <button
            type="button"
            onClick={() => setScoreOpen(true)}
            aria-label="Voir le score final"
            className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl bg-indigo-600 px-2 py-3 text-white shadow-lg transition hover:bg-indigo-500"
          >
            <span aria-hidden className="text-lg">
              🏆
            </span>
            <span className="text-xs font-medium [writing-mode:vertical-rl]">
              Score
            </span>
          </button>

          <Drawer
            open={scoreOpen}
            onClose={() => setScoreOpen(false)}
            label="Score final"
          >
            <EndScorePanel game={game} onClose={() => setScoreOpen(false)} />
          </Drawer>
        </>
      ) : null}
    </div>
  );
}
