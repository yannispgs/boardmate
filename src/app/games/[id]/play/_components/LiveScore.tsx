"use client";

import type { GamePlayer, Player, PlayerId } from "@/lib/domain";

const stepBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-black/15 text-lg font-semibold leading-none transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5";

/**
 * Live per-player score list for a game scored during play (e.g. Catan). Fully
 * controlled: the running totals live in the parent ({@link ScorePanel}) so they
 * survive the panel being opened/closed. Each score is bumped with −/+; the
 * objective (a threshold win condition's target) is shown so the race to it is
 * visible. When `allowNegative` is false the − button is disabled at 0.
 */
export function LiveScore({
  players,
  scores,
  threshold,
  allowNegative,
  onBump,
  disabled,
}: {
  players: Array<GamePlayer & { player: Player }>;
  scores: Record<string, number>;
  threshold: number | null;
  allowNegative: boolean;
  onBump: (playerId: PlayerId, delta: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
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
        const minusDisabled = disabled || (!allowNegative && score <= 0);

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
                onClick={() => onBump(p.playerId, -1)}
                disabled={minusDisabled}
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
                onClick={() => onBump(p.playerId, 1)}
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
