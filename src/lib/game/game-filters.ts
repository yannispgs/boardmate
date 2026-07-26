import type {
  BoardgameId,
  GameListItem,
  GameStatus,
  PlayerId,
} from "@/lib/domain";

/**
 * Narrowing a set of games down to the ones worth looking at: which game was
 * played, who was at the table, when, and whether it is over. The same
 * questions are asked of the statistics and of the games list, so the rule
 * lives here once and both hand it the shape they hold ({@link FilterableGame}).
 */
export interface GameFilter {
  /** Keep only games of these boardgames (empty = all). */
  boardgameIds: BoardgameId[];
  /**
   * Presence filter: keep only the games featuring EVERY one of these players.
   * Asking for two players means "the games we played together", not "the games
   * either of us played" — the narrower reading is the one worth a filter.
   */
  playerIds: PlayerId[];
  /** Keep games filed on or after this day (`YYYY-MM-DD`), or `null`. */
  from: string | null;
  /** Keep games filed on or before this day (`YYYY-MM-DD`), or `null`. */
  until: string | null;
  /**
   * Keep only the games in this state, or `null` for both. There are two
   * statuses, so asking for both is the same as asking for neither — hence a
   * single value rather than a set.
   */
  status: GameStatus | null;
}

/** Everything filtering needs of a game, whatever record it came from. */
export interface FilterableGame {
  boardgameId: string;
  playerIds: string[];
  /** The day it is filed under, `YYYY-MM-DD`; empty when it has none. */
  day: string;
  status: GameStatus;
}

/** The filter that keeps everything — the state the screens open in. */
export const NO_GAME_FILTER: GameFilter = {
  boardgameIds: [],
  playerIds: [],
  from: null,
  until: null,
  status: null,
};

/** Whether a game survives the filter. Absent criteria never exclude anything. */
export function matchesGameFilter(
  game: FilterableGame,
  filter: Partial<GameFilter>,
): boolean {
  const boardgameIds = filter.boardgameIds ?? [];
  const playerIds = filter.playerIds ?? [];

  // `some` rather than `includes`: the ids the caller holds are branded, the
  // ones a filterable game carries are plain strings, and only `===` narrows
  // across the two.
  if (
    boardgameIds.length > 0 &&
    !boardgameIds.some(id => id === game.boardgameId)
  ) {
    return false;
  }

  if (!playerIds.every(id => game.playerIds.includes(id))) {
    return false;
  }

  if (filter.from && game.day < filter.from) {
    return false;
  }

  if (filter.until && game.day > filter.until) {
    return false;
  }

  return !(filter.status && game.status !== filter.status);
}

/**
 * How many criteria the filter is actually narrowing on — what the collapsed
 * filter button shows, so a filter left on is never invisible.
 *
 * The two dates count as one: a period is one idea however many of its ends are
 * pinned. So do the boardgames, which widen each other. The players do not:
 * each one added narrows the result further, so each is its own criterion.
 */
export function activeFilterCount(filter: GameFilter): number {
  const dates = filter.from !== null || filter.until !== null ? 1 : 0;
  const boardgames = filter.boardgameIds.length > 0 ? 1 : 0;
  const status = filter.status !== null ? 1 : 0;

  return boardgames + filter.playerIds.length + dates + status;
}

/**
 * The games of a list matching the filter. A list holds games still being
 * played, so they are filed under the day they **started** — the day the
 * statistics file a game under, the day it ended, is not a date an unfinished
 * game has.
 */
export function filterGameList(
  games: GameListItem[],
  filter: GameFilter,
): GameListItem[] {
  return games.filter(game =>
    matchesGameFilter(
      {
        boardgameId: game.boardgameId,
        playerIds: game.players.map(p => p.id),
        day: game.startedAt.slice(0, 10),
        status: game.status,
      },
      filter,
    ),
  );
}

/**
 * The boardgames on offer in the filter: those actually played, named, sorted.
 * Filtering on a game nobody has ever played can only return nothing, so it is
 * not offered.
 */
export function playedBoardgames(
  games: GameListItem[],
  nameOf: (id: BoardgameId) => string | undefined,
): Array<{ id: BoardgameId; name: string }> {
  const names = new Map<BoardgameId, string>();

  for (const game of games) {
    names.set(game.boardgameId, nameOf(game.boardgameId) ?? "Jeu inconnu");
  }

  return [...names.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The players on offer in the filter: everyone who shares a game with all of
 * those already picked, so narrowing the selection can never leave the list
 * empty. Mirrors the statistics' own co-player filter.
 */
export function filterablePlayers(
  games: GameListItem[],
  selectedIds: PlayerId[],
): Array<{ id: PlayerId; name: string }> {
  const shared = filterGameList(games, {
    ...NO_GAME_FILTER,
    playerIds: selectedIds,
  });
  const names = new Map<PlayerId, string>();

  for (const game of shared) {
    for (const player of game.players) {
      names.set(player.id, player.name);
    }
  }

  return [...names.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
