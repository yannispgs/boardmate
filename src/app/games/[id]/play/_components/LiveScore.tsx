"use client";

import { useState } from "react";

import type { GamePlayer, Player, PlayerId } from "@/lib/domain";

const stepBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-black/15 text-lg font-semibold leading-none transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5";

/**
 * Live per-player score for a game scored during play (e.g. Catan). Each score
 * is bumped with −/+ and persisted immediately (via `onSet`); the objective (a
 * threshold win condition's target) is shown so the race to it is visible. The
 * parent watches `onSet` to detect the win.
 */
export function LiveScore({
  players,
  threshold,
  onSet,
  disabled,
}: {
  players: Array<GamePlayer & { player: Player }>;
  threshold: number | null;
  onSet: (playerId: PlayerId, score: number) => void;
  disabled: boolean;
}) {
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map(p => [p.playerId, p.score ?? 0])),
  );

  const bump = (playerId: PlayerId, delta: number) => {
    const next = (scores[playerId] ?? 0) + delta;
    setScores(s => ({ ...s, [playerId]: next }));
    onSet(playerId, next);
  };

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Scores</p>
        {threshold !== null ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Objectif : {threshold} pts
          </p>
        ) : null}
      </div>
      {players.map(p => {
        const score = scores[p.playerId] ?? 0;
        const reached = threshold !== null && score >= threshold;

        return (
          <div
            key={p.playerId}
            className="flex items-center justify-between gap-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm">
              {reached ? "🏆 " : ""}
              {p.player.name}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => bump(p.playerId, -1)}
                disabled={disabled}
                aria-label={`Retirer un point à ${p.player.name}`}
                className={stepBtn}
              >
                −
              </button>
              <span className="w-8 text-center font-semibold tabular-nums">
                {score}
              </span>
              <button
                type="button"
                onClick={() => bump(p.playerId, 1)}
                disabled={disabled}
                aria-label={`Ajouter un point à ${p.player.name}`}
                className={stepBtn}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
