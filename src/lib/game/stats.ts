/**
 * Pure end-of-game statistics, derived from the turn log and participation.
 *
 * Time/rhythm based: each turn records its active `durationS` (pauses excluded)
 * plus the pauses that happened during it (count + total paused seconds, ≥ 5 s
 * each). Score/placement stats will come once those columns exist on
 * `GamePlayer` (see `domain/game.ts`).
 */

import type { GamePlayer, GameTurn, PlayerId } from "@/lib/domain";
import { partyFigures } from "./party-figures";

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
  /** Seconds this player took beyond the allotted duration, across their turns. */
  overtimeS: number;
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

export interface MostOvertime {
  playerId: PlayerId;
  name: string;
  overtimeS: number;
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
  /** Total overtime seconds across the game (time taken beyond the limit). */
  totalOvertimeS: number;
  longestTurn: LongestTurn | null;
  /** Player who spent the most time paused during their turns (null if none). */
  mostPaused: MostPaused | null;
  /** Player who took the most overtime across their turns (null if none). */
  mostOvertime: MostOvertime | null;
  /** Players sorted fastest → slowest by mean turn; turn-less players last. */
  players: PlayerTimeStats[];
}

interface StatsInput {
  players: Array<GamePlayer & { player: { id: PlayerId; name: string } }>;
  turns: GameTurn[];
}

/** Computes the full statistics payload for a finished game. */
export function computeGameStats({ players, turns }: StatsInput): GameStats {
  // The table-level figures are the same ones the end-of-game tiles read a
  // party on, and they are measured there — from a bare turn log, so a party
  // pulled from the history can be measured the same way. Only the per-player
  // breakdown below is this file's own.
  const figures = partyFigures(turns);
  const activeTotalS = figures.playTime;

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
      overtimeS: own.reduce((sum, t) => sum + t.overtimeS, 0),
    };
  });

  // Fastest mean turn first; players who never played sink to the bottom.
  playerStats.sort((a, b) => {
    const av = a.turnCount > 0 ? a.avgS : Number.POSITIVE_INFINITY;
    const bv = b.turnCount > 0 ? b.avgS : Number.POSITIVE_INFINITY;

    return av - bv;
  });

  // Per-player stats only apply to sequential games, whose turns always have an
  // owner; ignore any owner-less (simultaneous) turns defensively.
  const ownedTurns = turns.filter(
    (t): t is GameTurn & { playerId: PlayerId } => t.playerId !== null,
  );
  const longest = ownedTurns.reduce<(GameTurn & { playerId: PlayerId }) | null>(
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

  // Who ran over their turn time the most (ties: first seated).
  const topOverrunner = playerStats.reduce<PlayerTimeStats | null>(
    (best, p) => (p.overtimeS > (best?.overtimeS ?? 0) ? p : best),
    null,
  );
  const mostOvertime: MostOvertime | null = topOverrunner
    ? {
        playerId: topOverrunner.playerId,
        name: topOverrunner.name,
        overtimeS: topOverrunner.overtimeS,
      }
    : null;

  return {
    activeTotalS,
    rounds: figures.rounds,
    turnCount: figures.turnCount,
    avgRoundS: figures.avgRound,
    totalPauseS: figures.pauseTime,
    // The one table figure `partyFigures` does not carry: the recorded history
    // keeps the paused seconds without saying how many pauses made them up.
    totalPauseCount: turns.reduce((sum, t) => sum + t.pauseCount, 0),
    totalOvertimeS: figures.overtime,
    longestTurn,
    mostPaused,
    mostOvertime,
    players: playerStats,
  };
}

/**
 * The player eating a disproportionate share of the table's time, or null.
 * Needs at least two players who've played; flags the leader only when clearly
 * above an even split (> 1.6× the fair share). Drives the "monopolise le temps"
 * callout and the live banner.
 */
export function timeHog(
  players: Pick<PlayerTimeStats, "name" | "sharePct" | "turnCount">[],
): { name: string; sharePct: number } | null {
  const played = players.filter(p => p.turnCount > 0);
  if (played.length < 2) {
    return null;
  }

  const top = played.reduce(
    (a, b) => (b.sharePct > a.sharePct ? b : a),
    played[0],
  );
  const equalShare = 100 / players.length;

  return top.sharePct > equalShare * 1.6
    ? { name: top.name, sharePct: top.sharePct }
    : null;
}

/**
 * The live "monopolise le temps" hog during play, but judged only on the rounds
 * that are **complete** (`round < currentRound`). Mid-round, the player who is
 * simply one turn ahead of the table would otherwise hold most of the recorded
 * time and be flagged unfairly; excluding the in-progress round means the hog
 * only refreshes once everyone has played that round — i.e. when the table
 * moves on to the next one.
 */
export function liveTimeHog(
  players: StatsInput["players"],
  turns: GameTurn[],
  currentRound: number,
): { name: string; sharePct: number } | null {
  const completed = turns.filter(t => t.round < currentRound);

  return timeHog(computeGameStats({ players, turns: completed }).players);
}
