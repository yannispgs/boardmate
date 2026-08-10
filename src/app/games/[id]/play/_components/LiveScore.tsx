"use client";

import { useEffect, useState } from "react";

import type { GamePlayer, Player, PlayerId } from "@/lib/domain";

const stepBtn =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-black/15 text-lg font-semibold leading-none transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5";

/**
 * Live per-player score list for a game scored during play (e.g. Catan). Fully
 * controlled: the running totals live in the parent so they survive the panel
 * closing. Each row exposes −/+ for single points AND a number field to enter a
 * total directly — a turn can bring several points at once, and typing the total
 * avoids the win firing early while you tap up to it. Setting a score is
 * absolute (`onSet(playerId, total)`). With `allowNegative` false the − is
 * disabled at the floor `minScore` (Catan: 2).
 */
export function LiveScore({
  players,
  scores,
  threshold,
  allowNegative,
  minScore,
  onSet,
  disabled,
}: Readonly<{
  players: Array<GamePlayer & { player: Player }>;
  scores: Record<string, number>;
  threshold: number | null;
  allowNegative: boolean;
  minScore: number;
  onSet: (playerId: PlayerId, score: number) => void;
  disabled: boolean;
}>) {
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
      {players.map(p => (
        <ScoreRow
          key={p.playerId}
          name={p.player.name}
          score={scores[p.playerId] ?? minScore}
          threshold={threshold}
          allowNegative={allowNegative}
          minScore={minScore}
          disabled={disabled}
          onSet={value => onSet(p.playerId, value)}
        />
      ))}
    </div>
  );
}

function ScoreRow({
  name,
  score,
  threshold,
  allowNegative,
  minScore,
  disabled,
  onSet,
}: Readonly<{
  name: string;
  score: number;
  threshold: number | null;
  allowNegative: boolean;
  minScore: number;
  disabled: boolean;
  onSet: (score: number) => void;
}>) {
  // Local draft so typing a multi-digit total doesn't persist each keystroke;
  // it commits on blur / Enter. Kept in sync when −/+ change the score.
  const [draft, setDraft] = useState(String(score));

  useEffect(() => {
    setDraft(String(score));
  }, [score]);

  const reached = threshold !== null && score >= threshold;
  const minusDisabled = disabled || (!allowNegative && score <= minScore);

  function commit() {
    const parsed = Number.parseInt(draft, 10);
    const value = Number.isFinite(parsed) ? parsed : score;
    const clamped = !allowNegative && value < minScore ? minScore : value;
    setDraft(String(clamped));

    if (clamped !== score) {
      onSet(clamped);
    }
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 flex-1 truncate text-sm">
        {reached ? "🏆 " : ""}
        {name}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSet(score - 1)}
          disabled={minusDisabled}
          aria-label={`Retirer un point à ${name}`}
          className={stepBtn}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          disabled={disabled}
          aria-label={`Score de ${name}`}
          className="w-14 rounded-lg border border-black/15 bg-white px-2 py-1 text-center font-semibold tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={() => onSet(score + 1)}
          disabled={disabled}
          aria-label={`Ajouter un point à ${name}`}
          className={stepBtn}
        >
          +
        </button>
      </div>
    </div>
  );
}
