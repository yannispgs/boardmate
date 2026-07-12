/**
 * Pure end-of-game statistics for simultaneous games (everyone plays at once
 * each round, e.g. Splito). There is no per-player time breakdown — instead we
 * summarise the time each *round* took, and how often the table waited on a
 * given player (tapped during play).
 */

import type { GamePlayer, GameTurn, PlayerId } from "@/lib/domain";

export interface RoundTime {
  round: number;
  durationS: number;
}

export interface WaitCount {
  playerId: PlayerId;
  name: string;
  /** How many rounds the table waited on this player. */
  count: number;
  /** Total seconds the table waited on them (tap → advance), across rounds. */
  totalS: number;
}

export interface SimultaneousStats {
  /** Total active seconds across all rounds (pauses excluded). */
  totalS: number;
  /** Number of rounds played. */
  roundCount: number;
  /** Active seconds per round, in play order. */
  rounds: RoundTime[];
  /** The longest round, or null if none were played. */
  longestRound: RoundTime | null;
  /** Per-player "we waited on them" counts, highest first, zero counts dropped. */
  waited: WaitCount[];
  /** The most-waited-on player, or null when nobody was ever flagged. */
  mostWaited: WaitCount | null;
}

interface Input {
  players: Array<GamePlayer & { player: { id: PlayerId; name: string } }>;
  turns: GameTurn[];
}

export function computeSimultaneousStats({
  players,
  turns,
}: Input): SimultaneousStats {
  const nameOf = (id: PlayerId): string =>
    players.find(p => p.playerId === id)?.player.name ?? "?";

  const ordered = [...turns].sort((a, b) => a.round - b.round);
  const rounds: RoundTime[] = ordered.map(t => ({
    round: t.round,
    durationS: t.durationS,
  }));

  const totalS = rounds.reduce((sum, r) => sum + r.durationS, 0);

  const longestRound = rounds.reduce<RoundTime | null>(
    (best, r) => (best === null || r.durationS > best.durationS ? r : best),
    null,
  );

  // Tally how many rounds the table waited on each player, and for how long.
  const tally = new Map<PlayerId, { count: number; totalS: number }>();
  for (const t of turns) {
    if (t.blockedById !== null) {
      const prev = tally.get(t.blockedById) ?? { count: 0, totalS: 0 };
      tally.set(t.blockedById, {
        count: prev.count + 1,
        totalS: prev.totalS + t.waitedS,
      });
    }
  }
  const waited: WaitCount[] = [...tally.entries()]
    .map(([playerId, { count, totalS }]) => ({
      playerId,
      name: nameOf(playerId),
      count,
      totalS,
    }))
    // Most-waited first; break ties by longer total wait.
    .sort((a, b) => b.count - a.count || b.totalS - a.totalS);

  return {
    totalS,
    roundCount: rounds.length,
    rounds,
    longestRound,
    waited,
    mostWaited: waited[0] ?? null,
  };
}
