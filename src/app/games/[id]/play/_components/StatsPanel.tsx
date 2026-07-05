"use client";

import { useState } from "react";

import type { GamePlayer, GameTurn, Player } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { computeGameStats } from "@/lib/game/stats";
import { PlayerStatCardList } from "./PlayerStatCardList";
import { StatTile } from "./StatTile";

/** Flags a player who's eating a disproportionate share of the table's time. */
function timeHog(
  players: { name: string; sharePct: number; turnCount: number }[],
): { name: string; sharePct: number } | null {
  const played = players.filter(p => p.turnCount > 0);
  if (played.length < 2) {
    return null;
  }

  const top = played.reduce((a, b) => (b.sharePct > a.sharePct ? b : a));
  const equalShare = 100 / players.length;
  // Clearly above an even split → worth calling out.
  return top.sharePct > equalShare * 1.6
    ? { name: top.name, sharePct: top.sharePct }
    : null;
}

/**
 * Live time statistics during play, behind a side button (next to the scores
 * one). Reuses the end-of-game time breakdown — computed from the turns played
 * so far — so you can see who's taking the most time mid-game, and a callout
 * flags anyone monopolising the table's time.
 */
export function StatsPanel({
  players,
  turns,
}: {
  players: Array<GamePlayer & { player: Player }>;
  turns: GameTurn[];
}) {
  const [open, setOpen] = useState(false);
  const stats = computeGameStats({ players, turns });
  const hog = timeHog(stats.players);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir les statistiques"
        className="fixed right-3 top-[38%] z-30 flex -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 p-3 text-white shadow-lg transition hover:bg-indigo-500"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <title>Statistiques</title>
          {/* Histogram: bars of varying heights on a baseline. */}
          <rect x="3" y="11" width="3.5" height="8" rx="0.75" />
          <rect x="8" y="6" width="3.5" height="13" rx="0.75" />
          <rect x="13" y="13" width="3.5" height="6" rx="0.75" />
          <rect x="17.5" y="9" width="3.5" height="10" rx="0.75" />
          <rect x="2" y="20" width="20" height="1.6" rx="0.8" />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Statistiques en direct"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          {/* Clicking the backdrop closes it; clicks inside the card don't. */}
          <div
            className="flex max-h-[85lvh] w-full max-w-sm flex-col rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 p-4 dark:border-white/10">
              <h2 className="text-base font-semibold">Stats en direct</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-lg border border-black/10 px-3 py-1 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                Fermer
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto p-4">
              {stats.turnCount === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Les statistiques s&apos;afficheront après le premier tour
                  joué.
                </p>
              ) : (
                <>
                  {hog ? (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm">
                      <span aria-hidden>⏱️</span>
                      <span>
                        <span className="font-semibold">{hog.name}</span>{" "}
                        monopolise le temps ({Math.round(hog.sharePct)} %)
                      </span>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-3 gap-2">
                    <StatTile
                      label="Temps de jeu"
                      value={formatDuration(stats.activeTotalS)}
                      accent
                    />
                    <StatTile label="Tours" value={String(stats.rounds)} />
                    <StatTile
                      label="Tour moyen"
                      value={formatDuration(stats.avgRoundS)}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Répartition du temps — du plus rapide au plus lent
                    </h3>
                    <PlayerStatCardList
                      players={stats.players}
                      scaleS={stats.longestTurn?.durationS ?? 0}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
