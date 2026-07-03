/**
 * Pure end-of-game statistics, derived from the turn log and participation.
 *
 * Time/rhythm based: each turn records its active `durationS` (pauses excluded)
 * plus the pauses that happened during it (count + total paused seconds, ≥ 5 s
 * each). Score/placement stats will come once those columns exist on
 * `GamePlayer` (see `domain/game.ts`).
 */

import type { GamePlayer, GameTurn, PlayerId } from "@/lib/domain";

export interface PlayerTimeStats {
  playerId: PlayerId;
  name: string;
  isWinner: boolean;
  /** Active seconds this player spent across all their turns. */
  totalS: number;
  turnCount: number;
  /** Mean active seconds per turn (0 when the player took no turn). */
  avgS: number;
  /** Fastest / slowest single turn (null when the player took no turn). */
  minS: number | null;
  maxS: number | null;
  /** Share of the game's total active time, 0–100 (0 when no time elapsed). */
  sharePct: number;
  /** Seconds this player spent paused during their own turns. */
  pauseS: number;
  /** How many pauses (≥ 5 s) this player took during their own turns. */
  pauseCount: number;
}

export interface LongestTurn {
  playerId: PlayerId;
  name: string;
  durationS: number;
  round: number;
}

export interface MostPaused {
  playerId: PlayerId;
  name: string;
  durationS: number;
  count: number;
}

export interface GameStats {
  /** Sum of every turn's active time. */
  activeTotalS: number;
  /** Rounds reached (highest round bearing a completed turn). */
  rounds: number;
  turnCount: number;
  /** Mean active seconds per round — a full table cycle (0 when no round). */
  avgRoundS: number;
  /** Total paused seconds across the game (pauses ≥ 5 s). */
  totalPauseS: number;
  totalPauseCount: number;
  longestTurn: LongestTurn | null;
  /** Player who spent the most time paused during their turns (null if none). */
  mostPaused: MostPaused | null;
  /** Players sorted fastest → slowest by mean turn; turn-less players last. */
  players: PlayerTimeStats[];
}

interface StatsInput {
  players: Array<GamePlayer & { player: { id: PlayerId; name: string } }>;
  turns: GameTurn[];
}

/** Computes the full statistics payload for a finished game. */
export function computeGameStats({ players, turns }: StatsInput): GameStats {
  const activeTotalS = turns.reduce((sum, t) => sum + t.durationS, 0);

  const playerStats: PlayerTimeStats[] = players.map(p => {
    const own = turns.filter(t => t.playerId === p.playerId);
    const totalS = own.reduce((sum, t) => sum + t.durationS, 0);
    const turnCount = own.length;
    const durations = own.map(t => t.durationS);

    return {
      playerId: p.playerId,
      name: p.player.name,
      isWinner: p.isWinner,
      totalS,
      turnCount,
      avgS: turnCount > 0 ? totalS / turnCount : 0,
      minS: turnCount > 0 ? Math.min(...durations) : null,
      maxS: turnCount > 0 ? Math.max(...durations) : null,
      sharePct: activeTotalS > 0 ? (totalS / activeTotalS) * 100 : 0,
      pauseS: own.reduce((sum, t) => sum + t.pauseDurationS, 0),
      pauseCount: own.reduce((sum, t) => sum + t.pauseCount, 0),
    };
  });

  // Fastest mean turn first; players who never played sink to the bottom.
  playerStats.sort((a, b) => {
    const av = a.turnCount > 0 ? a.avgS : Number.POSITIVE_INFINITY;
    const bv = b.turnCount > 0 ? b.avgS : Number.POSITIVE_INFINITY;

    return av - bv;
  });

  const longest = turns.reduce<GameTurn | null>(
    (best, t) => (best === null || t.durationS > best.durationS ? t : best),
    null,
  );
  const longestTurn: LongestTurn | null = longest
    ? {
        playerId: longest.playerId,
        name:
          players.find(p => p.playerId === longest.playerId)?.player.name ??
          "?",
        durationS: longest.durationS,
        round: longest.round,
      }
    : null;

  // Who spent the most time paused during their own turns (ties: first seated).
  const topPauser = playerStats.reduce<PlayerTimeStats | null>(
    (best, p) => (p.pauseS > (best?.pauseS ?? 0) ? p : best),
    null,
  );
  const mostPaused: MostPaused | null = topPauser
    ? {
        playerId: topPauser.playerId,
        name: topPauser.name,
        durationS: topPauser.pauseS,
        count: topPauser.pauseCount,
      }
    : null;

  const rounds = turns.reduce((max, t) => Math.max(max, t.round), 0);

  return {
    activeTotalS,
    rounds,
    turnCount: turns.length,
    avgRoundS: rounds > 0 ? activeTotalS / rounds : 0,
    totalPauseS: turns.reduce((sum, t) => sum + t.pauseDurationS, 0),
    totalPauseCount: turns.reduce((sum, t) => sum + t.pauseCount, 0),
    longestTurn,
    mostPaused,
    players: playerStats,
  };
}
