"use client";

import { useState } from "react";

import type { PlayerId } from "@/lib/domain";
import { revealGroups } from "@/lib/game/reveal";
import type { ScoreRecord } from "@/lib/game/score-records";
import type { Ranked } from "@/lib/game/scoring";
import { formatNames } from "@/lib/game/tie-break";
import { RecordBadgeList } from "./RecordBadgeList";

/** The unsettled ex æquo at the top, which the reveal stops on. */
export interface RevealTieBreak {
  /** What the button offers: applying the game's rules, or sharing the win. */
  label: string;
  onOpen: () => void;
}

/**
 * Suspense reveal of the final standings: opens on an empty board, then steps up
 * one **place** at a time from the last to the first. Players sharing a place
 * come out together, so an ex æquo is only ever announced when the reveal
 * reaches it — the tie for the win included, which is why nobody is crowned
 * until `winners` is settled. The button reads "Afficher" for the very first
 * reveal, "Suivant" while climbing, then either the tie-break's own label or
 * "Voir les scores" once the winner is known.
 */
export function RankingReveal({
  ranking,
  players,
  winners,
  records,
  tieBreak,
  onDone,
}: Readonly<{
  ranking: Ranked[];
  players: { id: PlayerId; name: string }[];
  /** Who won; empty while the leaders are still level and unsettled. */
  winners: PlayerId[];
  /** The records each player just took, so the line says so as it comes out. */
  records: ReadonlyMap<PlayerId, ScoreRecord[]>;
  /** How to settle those leaders, or null when there is nothing to settle. */
  tieBreak: RevealTieBreak | null;
  onDone: () => void;
}>) {
  // One step per place, worst first; the winner's place is the last one out.
  const groups = revealGroups(ranking);
  // Start at 0: nobody is shown until the first "Afficher".
  const [shown, setShown] = useState(0);

  const nameOf = (id: PlayerId) => players.find(p => p.id === id)?.name ?? "?";
  const done = shown >= groups.length;
  // Revealed so far, shown best-first (so the winner rises to the top last).
  const revealed = groups.slice(0, shown).flatMap(g => g.players);
  const displayed = [...revealed].sort((a, b) => a.rank - b.rank);
  const latest = shown > 0 ? groups[shown - 1] : null;
  // The reveal is over but the game isn't: the leaders came out level.
  const unsettled = done && tieBreak !== null;

  function caption(): string {
    if (shown === 0) {
      return "Du dernier au premier…";
    }

    const names = formatNames(
      (latest?.players ?? []).map(g => nameOf(g.playerId)),
    );

    if (unsettled) {
      return `Égalité 🤝 — ${names} à ${latest?.players[0].total} points`;
    }

    if (done) {
      return "🏆 Et le vainqueur est…";
    }

    const place = `${latest?.rank}ᵉ place`;

    return `${place}${(latest?.players.length ?? 0) > 1 ? " ex æquo" : ""} · ${names}`;
  }

  function label(): string {
    if (!done) {
      return shown === 0 ? "Afficher" : "Suivant";
    }

    return tieBreak?.label ?? "Voir les scores";
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
          const isWinner = winners.includes(r.playerId);
          // A group is exactly one place, so sharing its rank is being in it.
          const isLatest = latest?.rank === r.rank;

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
              <span className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">
                  {r.total} pts
                </span>
                <RecordBadgeList records={records.get(r.playerId) ?? []} />
              </span>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => {
          if (!done) {
            setShown(s => s + 1);

            return;
          }

          if (tieBreak) {
            tieBreak.onOpen();

            return;
          }

          onDone();
        }}
        className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500"
      >
        {label()}
      </button>
    </div>
  );
}
