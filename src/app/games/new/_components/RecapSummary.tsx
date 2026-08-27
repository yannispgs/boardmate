"use client";

import type { Config, Player } from "@/lib/domain";

/**
 * What the funnel already knows about the game being started — the game, the
 * configuration, who plays and in which order — plus the wheel that shuffles
 * that order. Read-only: everything here is changed by going back a step.
 *
 * The order and its wheel only show on a game that hands the turn round. The
 * seats are still recorded on the others — they order the score sheet — but
 * naming a first player there would name somebody the game never moves off.
 */
export function RecapSummary({
  boardgameName,
  config,
  players,
  ordered,
  onDrawFirstPlayer,
}: Readonly<{
  boardgameName: string;
  config: Config | null;
  players: Player[];
  /**
   * Whether the game hands the turn from one player to the next. When it does
   * not, there is no order to number and no first player to draw.
   */
  ordered: boolean;
  onDrawFirstPlayer: () => void;
}>) {
  const seated = ordered
    ? players.map((p, i) => `${i + 1}. ${p.name}`).join(" · ")
    : players.map(p => p.name).join(", ");

  return (
    <>
      <dl className="flex flex-col gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.02]">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500 dark:text-zinc-400">Jeu</dt>
          <dd className="font-medium">{boardgameName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500 dark:text-zinc-400">Configuration</dt>
          <dd className="font-medium">
            {config ? config.name : "Configuration par défaut"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500 dark:text-zinc-400">Joueurs</dt>
          <dd className="text-right font-medium">{seated}</dd>
        </div>
      </dl>

      {ordered && players.length >= 2 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.02]">
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Premier joueur ·{" "}
            </span>
            <span className="font-medium">{players[0]?.name}</span>
          </span>
          <button
            type="button"
            onClick={onDrawFirstPlayer}
            className="rounded-lg border border-indigo-500/40 px-3 py-1.5 font-medium text-indigo-600 transition hover:bg-indigo-500/10 dark:text-indigo-400"
          >
            🎡 Tirer au sort
          </button>
        </div>
      ) : null}
    </>
  );
}
