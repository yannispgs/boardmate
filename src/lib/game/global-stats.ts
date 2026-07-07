/**
 * Cross-game statistics for the global stats page: takes every finished game
 * (reduced to a `GameStatsRecord`) and averages the per-game figures — overall
 * and per player — under optional boardgame / player filters. Pure: no network,
 * no vendor types, unit-tested.
 */
import type { BoardgameId, GameStatsRecord, PlayerId } from "@/lib/domain";

export interface GlobalStatsFilters {
  /** Keep only games of these boardgames (empty = all). */
  boardgameIds?: BoardgameId[];
  /** Keep only games featuring at least one of these players, and show only
   * their rows (empty = all players). */
  playerIds?: PlayerId[];
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
  /** Mean share of the table's active time across their games, 0–100. */
  avgSharePct: number;
  /** Mean overtime seconds per game. */
  avgOvertimeS: number;
  /** Mean paused seconds per game. */
  avgPauseS: number;
}

export interface GlobalStats {
  gameCount: number;
  /** Total active time across the filtered games. */
  totalActiveS: number;
  /** Mean active time per game. */
  avgActiveS: number;
  /** Mean number of rounds per game. */
  avgRounds: number;
  /** Mean active seconds of a single turn, across all turns. */
  avgTurnS: number;
  /** Per-player leaderboard, best win rate first. */
  players: PlayerAggregate[];
}

function activeTotal(game: GameStatsRecord): number {
  return game.turns.reduce((sum, t) => sum + t.durationS, 0);
}

function roundsOf(game: GameStatsRecord): number {
  return game.turns.reduce((max, t) => Math.max(max, t.round), 0);
}

/** Filters the games, then averages overall + per-player figures over them. */
export function computeGlobalStats(
  records: GameStatsRecord[],
  filters: GlobalStatsFilters = {},
): GlobalStats {
  const boardgameIds = filters.boardgameIds ?? [];
  const playerIds = filters.playerIds ?? [];

  const games = records.filter(g => {
    const byGame =
      boardgameIds.length === 0 || boardgameIds.includes(g.boardgameId);
    const byPlayer =
      playerIds.length === 0 ||
      g.players.some(p => playerIds.includes(p.playerId));

    return byGame && byPlayer;
  });

  const gameCount = games.length;
  const totalActiveS = games.reduce((sum, g) => sum + activeTotal(g), 0);
  const totalTurns = games.reduce((sum, g) => sum + g.turns.length, 0);
  const totalRounds = games.reduce((sum, g) => sum + roundsOf(g), 0);

  // Accumulate per-player figures across every game they appear in.
  const acc = new Map<
    PlayerId,
    {
      name: string;
      games: number;
      wins: number;
      scoreSum: number;
      scoredGames: number;
      turnS: number;
      turnCount: number;
      shareSum: number;
      shareGames: number;
      overtimeS: number;
      pauseS: number;
    }
  >();

  for (const game of games) {
    const gameActive = activeTotal(game);

    for (const p of game.players) {
      const own = game.turns.filter(t => t.playerId === p.playerId);
      const ownActive = own.reduce((s, t) => s + t.durationS, 0);

      const cur = acc.get(p.playerId) ?? {
        name: p.name,
        games: 0,
        wins: 0,
        scoreSum: 0,
        scoredGames: 0,
        turnS: 0,
        turnCount: 0,
        shareSum: 0,
        shareGames: 0,
        overtimeS: 0,
        pauseS: 0,
      };

      cur.games += 1;
      cur.wins += p.isWinner ? 1 : 0;

      if (p.score !== null) {
        cur.scoreSum += p.score;
        cur.scoredGames += 1;
      }

      cur.turnS += ownActive;
      cur.turnCount += own.length;

      if (gameActive > 0) {
        cur.shareSum += (ownActive / gameActive) * 100;
        cur.shareGames += 1;
      }

      cur.overtimeS += own.reduce((s, t) => s + t.overtimeS, 0);
      cur.pauseS += own.reduce((s, t) => s + t.pauseDurationS, 0);

      acc.set(p.playerId, cur);
    }
  }

  const shown =
    playerIds.length === 0
      ? [...acc.keys()]
      : [...acc.keys()].filter(id => playerIds.includes(id));

  const players: PlayerAggregate[] = shown.map(id => {
    // `acc` has an entry for every id in `shown` (built from the same games).
    const a = acc.get(id) as NonNullable<ReturnType<typeof acc.get>>;

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
      avgSharePct: a.shareGames > 0 ? a.shareSum / a.shareGames : 0,
      avgOvertimeS: a.overtimeS / a.games,
      avgPauseS: a.pauseS / a.games,
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

  return {
    gameCount,
    totalActiveS,
    avgActiveS: gameCount > 0 ? totalActiveS / gameCount : 0,
    avgRounds: gameCount > 0 ? totalRounds / gameCount : 0,
    avgTurnS: totalTurns > 0 ? totalActiveS / totalTurns : 0,
    players,
  };
}
