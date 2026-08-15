/**
 * Cross-game statistics for the global stats page: takes every finished game
 * (reduced to a `GameStatsRecord`) and averages the per-game figures — overall,
 * per player, and per player-per-game — under optional filters (boardgame,
 * player presence, date window). Pure: no network, no vendor types, unit-tested.
 */
import type { BoardgameId, GameStatsRecord, PlayerId } from "@/lib/domain";
import { localDay, matchesGameFilter } from "./game-filters";

export interface GlobalStatsFilters {
  /** Keep only games of these boardgames (empty = all). */
  boardgameIds?: BoardgameId[];
  /**
   * Presence filter: keep only games featuring EVERY one of these players
   * (empty = all games). Every player of the surviving games is still ranked —
   * restricting which rows to *display* is the caller's job.
   */
  playerIds?: PlayerId[];
  /** Keep games whose end date (YYYY-MM-DD) is ≥ this (inclusive). */
  from?: string;
  /** Keep games whose end date (YYYY-MM-DD) is ≤ this (inclusive). */
  until?: string;
}

/** One player's record on one boardgame. */
export interface GameBreakdown {
  boardgameId: BoardgameId;
  boardgameName: string;
  games: number;
  wins: number;
  /** Win rate on this game, 0–100. */
  winRate: number;
  /** Mean recorded score on this game (null if none scored). */
  avgScore: number | null;
  /** Time index on this game, 100 = their fair share (null without time data). */
  timeIndex: number | null;
}

export interface PlayerAggregate {
  playerId: PlayerId;
  name: string;
  /** Games this player took part in (within the filtered set). */
  games: number;
  wins: number;
  /** Win rate over their games, 0–100. */
  winRate: number;
  /** Games where a score was recorded (denominator for `avgScore`). */
  scoredGames: number;
  /** Mean recorded score over their scored games (null if none scored). */
  avgScore: number | null;
  /** Mean active seconds per turn they played (0 if they never played a turn). */
  avgTurnS: number;
  /**
   * Time index: how their time compares to a fair share, averaged per game then
   * across games. 100 = exactly the fair share (an even split of the table's
   * active time); below 100 = faster than expected, above = slower. Normalising
   * per game means table size doesn't penalise players who often play in big
   * groups. Null when no game had recorded time.
   */
  timeIndex: number | null;
  /** Mean overtime seconds per PLAYED game (games with a turn log). */
  avgOvertimeS: number;
  /** Mean paused seconds per PLAYED game (games with a turn log). */
  avgPauseS: number;
  /** Their record on each boardgame, most-played first. */
  byGame: GameBreakdown[];
  /** The boardgame they've played most (null if they've played none). */
  mostPlayedGame: GameBreakdown | null;
  /** Best win rate (null unless they've played ≥ 2 distinct boardgames). */
  bestGame: GameBreakdown | null;
  /** Worst win rate (null unless they've played ≥ 2 distinct boardgames). */
  worstGame: GameBreakdown | null;
}

export interface GlobalStats {
  gameCount: number;
  /** Total active time across the filtered games. */
  totalActiveS: number;
  /** Mean active time per PLAYED game (games with a turn log). */
  avgActiveS: number;
  /** Mean number of rounds per PLAYED game (games with a turn log). */
  avgRounds: number;
  /** Mean active seconds of a single turn, across all turns. */
  avgTurnS: number;
  /** Mean recorded score across every scored participation (null if none). */
  avgScore: number | null;
  /** Per-player leaderboard, best win rate first. */
  players: PlayerAggregate[];
}

interface GameAcc {
  name: string;
  games: number;
  wins: number;
  scoreSum: number;
  scored: number;
  indexSum: number;
  indexGames: number;
}

interface PlayerAcc {
  name: string;
  games: number;
  wins: number;
  scoreSum: number;
  scoredGames: number;
  turnS: number;
  turnCount: number;
  indexSum: number;
  indexGames: number;
  overtimeS: number;
  pauseS: number;
  byGame: Map<string, GameAcc>;
}

function newPlayerAcc(name: string): PlayerAcc {
  return {
    name,
    games: 0,
    wins: 0,
    scoreSum: 0,
    scoredGames: 0,
    turnS: 0,
    turnCount: 0,
    indexSum: 0,
    indexGames: 0,
    overtimeS: 0,
    pauseS: 0,
    byGame: new Map(),
  };
}

/** A player's fair-share time index for one game, or null without time data. */
function gameTimeIndex(
  ownActiveS: number,
  gameActiveS: number,
  playerCount: number,
): number | null {
  if (gameActiveS <= 0) {
    return null;
  }

  return (ownActiveS / gameActiveS) * playerCount * 100;
}

type StatsPlayer = GameStatsRecord["players"][number];

/** Folds one player's share of one game into their per-boardgame breakdown. */
function accumulateBoardgame(
  cur: PlayerAcc,
  game: GameStatsRecord,
  p: StatsPlayer,
  idx: number | null,
): void {
  const bg = cur.byGame.get(game.boardgameId) ?? {
    name: game.boardgameName,
    games: 0,
    wins: 0,
    scoreSum: 0,
    scored: 0,
    indexSum: 0,
    indexGames: 0,
  };

  bg.games += 1;
  bg.wins += p.isWinner ? 1 : 0;

  if (p.score !== null) {
    bg.scoreSum += p.score;
    bg.scored += 1;
  }

  if (idx !== null) {
    bg.indexSum += idx;
    bg.indexGames += 1;
  }

  cur.byGame.set(game.boardgameId, bg);
}

/** Folds one player's share of one game into the running accumulator. */
function accumulatePlayer(
  acc: Map<PlayerId, PlayerAcc>,
  game: GameStatsRecord,
  p: StatsPlayer,
  gameActiveS: number,
): void {
  const own = game.turns.filter(t => t.playerId === p.playerId);
  const ownActive = own.reduce((s, t) => s + t.durationS, 0);
  const idx = gameTimeIndex(ownActive, gameActiveS, game.players.length);
  const cur = acc.get(p.playerId) ?? newPlayerAcc(p.name);

  cur.games += 1;
  cur.wins += p.isWinner ? 1 : 0;

  if (p.score !== null) {
    cur.scoreSum += p.score;
    cur.scoredGames += 1;
  }

  cur.turnS += ownActive;
  cur.turnCount += own.length;

  if (idx !== null) {
    cur.indexSum += idx;
    cur.indexGames += 1;
  }

  cur.overtimeS += own.reduce((s, t) => s + t.overtimeS, 0);
  cur.pauseS += own.reduce((s, t) => s + t.pauseDurationS, 0);

  accumulateBoardgame(cur, game, p, idx);

  acc.set(p.playerId, cur);
}

/** The finished row for one player: their averages plus their best/worst game. */
function toAggregate(id: PlayerId, a: PlayerAcc): PlayerAggregate {
  const byGame: GameBreakdown[] = [...a.byGame.entries()]
    .map(([boardgameId, g]) => ({
      boardgameId: boardgameId as BoardgameId,
      boardgameName: g.name,
      games: g.games,
      wins: g.wins,
      winRate: (g.wins / g.games) * 100,
      avgScore: g.scored > 0 ? g.scoreSum / g.scored : null,
      timeIndex: g.indexGames > 0 ? g.indexSum / g.indexGames : null,
    }))
    .sort((x, y) => y.games - x.games || y.winRate - x.winRate);

  // `a.games` is ≥ 1 for any accumulated player (added inside the game loop).
  return {
    playerId: id,
    name: a.name,
    games: a.games,
    wins: a.wins,
    winRate: (a.wins / a.games) * 100,
    scoredGames: a.scoredGames,
    avgScore: a.scoredGames > 0 ? a.scoreSum / a.scoredGames : null,
    avgTurnS: a.turnCount > 0 ? a.turnS / a.turnCount : 0,
    timeIndex: a.indexGames > 0 ? a.indexSum / a.indexGames : null,
    // Per PLAYED game (`indexGames`), not every game — a recorded-after-the-
    // fact game has no turns and would otherwise drag these averages down.
    avgOvertimeS: a.indexGames > 0 ? a.overtimeS / a.indexGames : 0,
    avgPauseS: a.indexGames > 0 ? a.pauseS / a.indexGames : 0,
    byGame,
    ...extremes(byGame),
  };
}

function activeTotal(game: GameStatsRecord): number {
  return game.turns.reduce((sum, t) => sum + t.durationS, 0);
}

function roundsOf(game: GameStatsRecord): number {
  return game.turns.reduce((max, t) => Math.max(max, t.round), 0);
}

/**
 * Games below this many plays are ignored for the best/worst comparison — a
 * game played once (100% or 0%) would otherwise dominate it meaninglessly.
 */
export const MIN_GAMES_FOR_EXTREME = 3;

/** Most-played, best and worst boardgame from a player's per-game records. */
function extremes(byGame: GameBreakdown[]): {
  mostPlayedGame: GameBreakdown | null;
  bestGame: GameBreakdown | null;
  worstGame: GameBreakdown | null;
} {
  /* c8 ignore next 3 -- defensive: callers only pass a non-empty breakdown */
  if (byGame.length === 0) {
    return { mostPlayedGame: null, bestGame: null, worstGame: null };
  }

  // `byGame` arrives sorted most-played first, so the head is the most played.
  const mostPlayedGame = byGame[0];

  // Best/worst need ≥ 2 games with a big enough sample to mean anything.
  const eligible = byGame.filter(g => g.games >= MIN_GAMES_FOR_EXTREME);
  if (eligible.length < 2) {
    return { mostPlayedGame, bestGame: null, worstGame: null };
  }

  const byRate = [...eligible].sort((a, b) => a.winRate - b.winRate);

  return {
    mostPlayedGame,
    /* c8 ignore next -- `?? null` fallback: `eligible` holds 2+ games here */
    bestGame: byRate.at(-1) ?? null,
    worstGame: byRate[0],
  };
}

/**
 * The games matching the filters: of the given boardgames (any, if none),
 * featuring every requested player (presence), within the end-date window.
 * Shared by `computeGlobalStats` and callers that need the raw filtered set
 * (e.g. aggregating dice rolls).
 */
export function filterRecords(
  records: GameStatsRecord[],
  filters: GlobalStatsFilters = {},
): GameStatsRecord[] {
  return records.filter(g =>
    matchesGameFilter(
      {
        boardgameId: g.boardgameId,
        playerIds: g.players.map(p => p.playerId),
        // Statistics are about games that are over, so a record is filed under
        // the day it ended — the day it ended where it was played; one without
        // an end date matches no window at all.
        day: g.endedAt === null ? "" : localDay(g.endedAt),
        // A statistics record only ever describes a game that is over, so the
        // status criterion has nothing left to sort out here.
        status: "ended",
      },
      { ...filters, from: filters.from ?? null, until: filters.until ?? null },
    ),
  );
}

/**
 * The boardgames these records cover, sorted by name — which is not the same
 * list as the library: a game nobody has finished a party of has nothing to
 * add to, or take away from, the figures a filter is narrowing.
 */
export function boardgameOptions(
  records: GameStatsRecord[],
): Array<{ id: BoardgameId; name: string }> {
  const names = new Map<BoardgameId, string>();

  for (const g of records) {
    names.set(g.boardgameId, g.boardgameName);
  }

  return [...names.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The players offered in a presence filter given a partial selection: every
 * player who shares at least one game with all currently-selected players — so
 * narrowing the filter can never produce an empty set. Sorted by name. An empty
 * selection offers everyone; the selected players are always included (they
 * co-occur with themselves). Pass records already scoped to a boardgame to
 * restrict co-play to that game.
 */
export function coPlayerOptions(
  records: GameStatsRecord[],
  selectedIds: string[],
): Array<{ id: string; name: string }> {
  const shared = filterRecords(records, {
    playerIds: selectedIds as PlayerId[],
  });
  const names = new Map<string, string>();

  for (const g of shared) {
    for (const p of g.players) {
      names.set(p.playerId, p.name);
    }
  }

  return [...names.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Filters the games, then averages overall + per-player figures over them. */
export function computeGlobalStats(
  records: GameStatsRecord[],
  filters: GlobalStatsFilters = {},
): GlobalStats {
  const games = filterRecords(records, filters);
  const gameCount = games.length;
  const totalActiveS = games.reduce((sum, g) => sum + activeTotal(g), 0);
  const totalTurns = games.reduce((sum, g) => sum + g.turns.length, 0);
  const totalRounds = games.reduce((sum, g) => sum + roundsOf(g), 0);
  // Time / round means average over games that were actually PLAYED (they carry
  // a turn log). A game recorded after the fact has no turns, so it must not
  // dilute those figures — it still counts for wins / scores (via `gameCount`).
  const timedGames = games.filter(g => g.turns.length > 0).length;

  const acc = new Map<PlayerId, PlayerAcc>();

  for (const game of games) {
    const gameActive = activeTotal(game);

    for (const p of game.players) {
      accumulatePlayer(acc, game, p, gameActive);
    }
  }

  // `acc` has an entry for every id here (this iterates its own keys).
  const players: PlayerAggregate[] = [...acc.keys()].map(id =>
    toAggregate(id, acc.get(id) as PlayerAcc),
  );

  // Best win rate first; ties broken by more games, then more wins, then name.
  players.sort(
    (x, y) =>
      y.winRate - x.winRate ||
      y.games - x.games ||
      y.wins - x.wins ||
      x.name.localeCompare(y.name),
  );

  // Overall mean score across every scored participation in the filtered games
  // (all players, not just the shown rows) — mirrors the other overall tiles.
  let scoreSum = 0;
  let scoredCount = 0;
  for (const a of acc.values()) {
    scoreSum += a.scoreSum;
    scoredCount += a.scoredGames;
  }

  return {
    gameCount,
    totalActiveS,
    avgActiveS: timedGames > 0 ? totalActiveS / timedGames : 0,
    avgRounds: timedGames > 0 ? totalRounds / timedGames : 0,
    avgTurnS: totalTurns > 0 ? totalActiveS / totalTurns : 0,
    avgScore: scoredCount > 0 ? scoreSum / scoredCount : null,
    players,
  };
}
