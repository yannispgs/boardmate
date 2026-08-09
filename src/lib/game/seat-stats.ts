import type { GameStatsRecord, PlayerId, TurnMode } from "@/lib/domain";

/**
 * Whether "first / middle / last to play" means anything for a game. It doesn't
 * when everybody plays at once (Splito): there is no such thing as playing
 * first, so the option to track it is hidden and never stored as on.
 */
export function seatOrderMatters(turnMode: TurnMode): boolean {
  return turnMode !== "simultaneous";
}

/** Where a player sat in the turn order, coarsened for the stats. */
export type SeatBucket = "first" | "middle" | "last";

export interface SeatStat {
  bucket: SeatBucket;
  /** Player-instances that fell in this bucket across the games. */
  games: number;
  /** Share of those instances that won (0–1), or null when there are none. */
  winRate: number | null;
  /**
   * Mean relative position in [0, 1] — 0 = always finished best, 1 = always
   * worst — normalised as `(rank − 1) / (n − 1)` so it is comparable across
   * player counts, and averaged with **one weight per game** (the intermediate
   * seats of a game are first averaged together, so a 6-player game does not
   * outweigh a 3-player one). Counts only games where every participant has a
   * score; null when no such game exists.
   */
  avgPosition: number | null;
}

/** Which end of the score wins: highest (Catan) or lowest (golf-like). */
export type ScoreDirection = "highest" | "lowest";

/** 1-based placement per player within one game; null if any score is missing. */
function placements(
  players: Array<{ playerId: PlayerId; score: number | null }>,
  direction: ScoreDirection,
): Map<PlayerId, number> | null {
  if (players.some(p => p.score === null)) {
    return null;
  }

  const sorted = [...players].sort((a, b) =>
    direction === "highest"
      ? (b.score as number) - (a.score as number)
      : (a.score as number) - (b.score as number),
  );
  const ranks = new Map<PlayerId, number>();
  let prevScore: number | null = null;
  let prevRank = 0;

  sorted.forEach((p, i) => {
    // Ties share the rank of the player above; otherwise the 1-based position.
    const rank = prevScore === p.score ? prevRank : i + 1;
    ranks.set(p.playerId, rank);
    prevScore = p.score;
    prevRank = rank;
  });

  return ranks;
}

/** The seat bucket for position `idx` in an `n`-player game (sorted by seat). */
function bucketAt(idx: number, n: number): SeatBucket {
  if (idx === 0) {
    return "first";
  }

  if (idx === n - 1) {
    return "last";
  }

  return "middle";
}

interface Bucket {
  games: number;
  wins: number;
  posSum: number;
  posCount: number;
}

/**
 * Rank (1 = best) as a relative position in [0, 1], independent of the player
 * count: 0 for the winner, 1 for the last. A lone player maps to 0.
 */
function relativePosition(rank: number, n: number): number {
  if (n <= 1) {
    return 0;
  }

  return (rank - 1) / (n - 1);
}

/**
 * Aggregates finished games by turn order: for the first, the intermediate and
 * the last player to play, their win rate and average relative position across
 * the given games. `direction` ranks placement (Catan wins highest). Position
 * is normalised to [0, 1] and averaged with one weight per game (a game's
 * intermediate seats are averaged together first), counted only for games where
 * every participant has a score; the win rate uses the recorded winner (per
 * player-instance) and so covers every game.
 */
export function computeSeatStats(
  records: GameStatsRecord[],
  direction: ScoreDirection,
): SeatStat[] {
  const order: SeatBucket[] = ["first", "middle", "last"];
  const acc: Record<SeatBucket, Bucket> = {
    first: { games: 0, wins: 0, posSum: 0, posCount: 0 },
    middle: { games: 0, wins: 0, posSum: 0, posCount: 0 },
    last: { games: 0, wins: 0, posSum: 0, posCount: 0 },
  };

  for (const record of records) {
    const players = [...record.players].sort(
      (a, b) => a.seatOrder - b.seatOrder,
    );
    const n = players.length;

    if (n === 0) {
      continue;
    }

    const ranks = placements(
      players.map(p => ({ playerId: p.playerId, score: p.score })),
      direction,
    );
    const positions: Record<SeatBucket, number[]> = {
      first: [],
      middle: [],
      last: [],
    };

    players.forEach((p, idx) => {
      const bucket = bucketAt(idx, n);
      const a = acc[bucket];
      a.games += 1;

      if (p.isWinner) {
        a.wins += 1;
      }

      if (ranks) {
        positions[bucket].push(
          relativePosition(ranks.get(p.playerId) as number, n),
        );
      }
    });

    // Fold each bucket's positions into a single per-game value, so every game
    // weighs the same regardless of how many intermediate seats it has.
    for (const bucket of order) {
      const values = positions[bucket];

      if (values.length > 0) {
        const a = acc[bucket];
        a.posSum += values.reduce((sum, v) => sum + v, 0) / values.length;
        a.posCount += 1;
      }
    }
  }

  return order.map(bucket => {
    const a = acc[bucket];

    return {
      bucket,
      games: a.games,
      winRate: a.games > 0 ? a.wins / a.games : null,
      avgPosition: a.posCount > 0 ? a.posSum / a.posCount : null,
    };
  });
}
