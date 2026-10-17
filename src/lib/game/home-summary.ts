/**
 * What the home page says about the games: the ones still on the table, to be
 * picked back up, and the last few finished.
 *
 * Pure: no vendor types, no React, unit-tested. The date is formatted by the
 * caller, in the reader's browser (see the conventions on dates).
 */

import type { GameListItem, StageSpec } from "@/lib/domain";

import { gameProgress } from "./game-progress";

/** The two things the home page needs to know about a boardgame. */
export interface HomeBoardgame {
  name: string;
  stages: StageSpec | null;
}

export interface OngoingSummary {
  id: string;
  title: string;
  players: string;
}

export interface RecentSummary {
  id: string;
  name: string;
  detail: string;
}

const UNKNOWN = "Partie";

function newestFirst(a: string, b: string): number {
  return b.localeCompare(a);
}

/**
 * The games in progress, most recently started first: « Catan · Tour 7 », and
 * who is playing.
 */
export function ongoingSummaries(
  games: readonly GameListItem[],
  boardgameOf: (game: GameListItem) => HomeBoardgame | undefined,
): OngoingSummary[] {
  return [...games]
    .sort((a, b) => newestFirst(a.startedAt, b.startedAt))
    .map(game => {
      const boardgame = boardgameOf(game);
      const progress = gameProgress(game, boardgame?.stages ?? null);

      return {
        id: game.id,
        title: `${boardgame?.name ?? UNKNOWN} · ${progress.label} ${progress.count}`,
        players: game.players.map(p => p.name).join(", "),
      };
    });
}

/**
 * The last `limit` finished games, most recently ended first: the game, who
 * won it and when.
 */
export function recentSummaries(
  games: readonly GameListItem[],
  boardgameOf: (game: GameListItem) => HomeBoardgame | undefined,
  limit: number,
  formatDay: (iso: string) => string,
): RecentSummary[] {
  return [...games]
    .sort((a, b) =>
      newestFirst(a.endedAt ?? a.startedAt, b.endedAt ?? b.startedAt),
    )
    .slice(0, limit)
    .map(game => {
      const winners = game.players.filter(p => p.isWinner).map(p => p.name);
      const day = formatDay(game.endedAt ?? game.startedAt);

      return {
        id: game.id,
        name: boardgameOf(game)?.name ?? UNKNOWN,
        detail: winners.length === 0 ? day : `${winners.join(" & ")} · ${day}`,
      };
    });
}
