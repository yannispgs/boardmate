/**
 * Pure end-of-game statistics, derived from the turn log and participation.
 *
 * Everything here is time/rhythm based — the only per-turn datum v1 records is
 * `durationS` (active seconds, pauses excluded). Score/placement stats will come
 * once those columns exist on `GamePlayer` (see `domain/game.ts`).
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
}

export interface LongestTurn {
  playerId: PlayerId;
  name: string;
  durationS: number;
  round: number;
}

export interface GameStats {
  /** Wall-clock seconds from start to end (null if either timestamp missing). */
  realDurationS: number | null;
  /** Sum of every turn's active time. */
  activeTotalS: number;
  /** Real minus active — setup, pauses, off-turn chatter (null, or ≥ 0). */
  offTurnS: number | null;
  /** Rounds reached (highest round bearing a completed turn). */
  rounds: number;
  turnCount: number;
  /** Mean active seconds per turn across the whole table (0 when no turn). */
  avgTurnS: number;
  longestTurn: LongestTurn | null;
  /** Players sorted fastest → slowest by mean turn; turn-less players last. */
  players: PlayerTimeStats[];
}

interface StatsInput {
  players: Array<GamePlayer & { player: { id: PlayerId; name: string } }>;
  turns: GameTurn[];
  startedAt: string;
  endedAt: string | null;
}

/** Computes the full statistics payload for a finished game. */
export function computeGameStats({
  players,
  turns,
  startedAt,
  endedAt,
}: StatsInput): GameStats {
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

  const rounds = turns.reduce((max, t) => Math.max(max, t.round), 0);

  const started = Date.parse(startedAt);
  const ended = endedAt ? Date.parse(endedAt) : Number.NaN;
  const realDurationS =
    Number.isFinite(started) && Number.isFinite(ended)
      ? Math.max(0, Math.round((ended - started) / 1000))
      : null;
  const offTurnS =
    realDurationS !== null ? Math.max(0, realDurationS - activeTotalS) : null;

  return {
    realDurationS,
    activeTotalS,
    offTurnS,
    rounds,
    turnCount: turns.length,
    avgTurnS: turns.length > 0 ? activeTotalS / turns.length : 0,
    longestTurn,
    players: playerStats,
  };
}
