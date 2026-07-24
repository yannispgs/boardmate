/**
 * Cross-game statistics for the global stats page: takes every finished game
 * (reduced to a `GameStatsRecord`) and averages the per-game figures — overall,
 * per player, and per player-per-game — under optional filters (boardgame,
 * player presence, date window). Pure: no network, no vendor types, unit-tested.
 */
import type { BoardgameId, GameStatsRecord, PlayerId } from "@/lib/domain";

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
    bestGame: byRate[byRate.length - 1],
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
  const boardgameIds = filters.boardgameIds ?? [];
  const playerIds = filters.playerIds ?? [];
  const from = filters.from;
  const until = filters.until;

  return records.filter(g => {
    const byBoardgame =
      boardgameIds.length === 0 || boardgameIds.includes(g.boardgameId);
    const byPlayer =
      playerIds.length === 0 ||
      playerIds.every(id => g.players.some(p => p.playerId === id));
    const day = g.endedAt?.slice(0, 10) ?? "";
    const inWindow = (!from || day >= from) && (!until || day <= until);

    return byBoardgame && byPlayer && inWindow;
  });
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
      const own = game.turns.filter(t => t.playerId === p.playerId);
      const ownActive = own.reduce((s, t) => s + t.durationS, 0);
      const idx = gameTimeIndex(ownActive, gameActive, game.players.length);

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

      acc.set(p.playerId, cur);
    }
  }

  const players: PlayerAggregate[] = [...acc.keys()].map(id => {
    // `acc` has an entry for every id here (this iterates its own keys).
    const a = acc.get(id) as PlayerAcc;

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
  });

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
