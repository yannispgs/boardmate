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
  count: number;
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

  // Tally how many rounds the table waited on each player.
  const counts = new Map<PlayerId, number>();
  for (const t of turns) {
    if (t.blockedById !== null) {
      counts.set(t.blockedById, (counts.get(t.blockedById) ?? 0) + 1);
    }
  }
  const waited: WaitCount[] = [...counts.entries()]
    .map(([playerId, count]) => ({ playerId, name: nameOf(playerId), count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalS,
    roundCount: rounds.length,
    rounds,
    longestRound,
    waited,
    mostWaited: waited[0] ?? null,
  };
}
