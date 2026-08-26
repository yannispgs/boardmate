"use client";

import type { ReactNode } from "react";

import { ChevronRightIcon } from "@/components/icons";
import type { GameListItem } from "@/lib/domain";
import { recordLabel, type ScoreRecord } from "@/lib/game/score-records";
import { RecordChip } from "./RecordChip";
import { StatusBadge } from "./StatusBadge";

/**
 * A sitting, folded into one row of the list: the parties dealt one after
 * another from the same score sheet, opened on demand.
 *
 * It exists because a Papayoo evening reaches « Parties » as a dozen lines that
 * say the same thing, burying every other game of the week under it. The row
 * says how many parties the evening was, when it happened, and whether one of
 * the parties inside holds the game's record — and nothing else: a session has
 * no winner and no cumulative score, so the parties inside keep counting for
 * themselves, here and in the statistics alike.
 *
 * The record mark is not an exception to that rule: it stays a fact about one
 * party, borrowed by the row only so a folded evening doesn't hide it. Leaving
 * it inside would mean the mark is only found by opening something, which is
 * precisely what putting it on the cards was meant to stop.
 *
 * An evening is over only once its last deal is, so the row reads its own
 * parties rather than being told: one deal still running keeps the whole
 * sitting on the table, wearing « Reprendre » so the evening doesn't have to be
 * opened to find out there is a game waiting inside it.
 */
export function GameSessionCard({
  games,
  boardgameName,
  logoUrl,
  records = [],
  children,
}: Readonly<{
  /** The parties of the sitting, in the order the list gave them. */
  games: GameListItem[];
  boardgameName: string;
  logoUrl: string | null;
  /**
   * The records worn by the parties of the sitting — usually none, one at most
   * in practice, since chaining deals the same table again and a record is read
   * per table size.
   */
  records?: readonly ScoreRecord[];
  /** The cards of those same parties, rendered by the list. */
  children: ReactNode;
}>) {
  // The evening is filed under the party it opened with, whatever order the
  // list happens to read in — ISO instants compare as text.
  const opened = games.reduce(
    (earliest, game) => (game.startedAt < earliest ? game.startedAt : earliest),
    games[0].startedAt,
  );
  const ended = games.every(game => game.status === "ended");

  return (
    <li>
      <details className="group">
        <summary
          className={`flex cursor-pointer list-none items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-indigo-400 dark:border-white/10 dark:bg-zinc-900 ${
            ended ? "opacity-60" : ""
          }`}
        >
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
          {logoUrl ? (
            // biome-ignore lint/performance/noImgElement: arbitrary Storage URLs, no next/image loader configured yet
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5 text-lg dark:bg-white/5"
            >
              🎲
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium">{boardgameName}</span>
              {records.map(record => (
                <RecordChip key={recordLabel(record)} record={record} />
              ))}
            </span>
            <span className="mt-0.5 text-xs text-zinc-500">
              {games.length} parties ·{" "}
              {new Date(opened).toLocaleDateString("fr-FR")}
            </span>
          </div>
          <StatusBadge ended={ended} />
        </summary>
        <ul className="mt-2 flex flex-col gap-2 border-l border-black/10 pl-3 dark:border-white/10">
          {children}
        </ul>
      </details>
    </li>
  );
}
