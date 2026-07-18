import type { GameStatsRecord, PlayerId } from "@/lib/domain";

/** Where a player sat in the turn order, coarsened for the stats. */
export type SeatBucket = "first" | "middle" | "last";

export interface SeatStat {
  bucket: SeatBucket;
  /** Player-instances that fell in this bucket across the games. */
  games: number;
  /** Share of those instances that won (0–1), or null when there are none. */
  winRate: number | null;
  /**
   * Mean final placement (1 = best), averaged over the games where every
   * participant has a score — null when no such game exists.
   */
  avgPlacement: number | null;
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
  placeSum: number;
  placeCount: number;
}

/**
 * Aggregates finished games by turn order: for the first, the intermediate and
 * the last player to play, their win rate and average final placement across
 * the given games. `direction` ranks placement (Catan wins highest). Placement
 * is counted only for games where every participant has a score; the win rate
 * uses the recorded winner and so covers every game.
 */
export function computeSeatStats(
  records: GameStatsRecord[],
  direction: ScoreDirection,
): SeatStat[] {
  const acc: Record<SeatBucket, Bucket> = {
    first: { games: 0, wins: 0, placeSum: 0, placeCount: 0 },
    middle: { games: 0, wins: 0, placeSum: 0, placeCount: 0 },
    last: { games: 0, wins: 0, placeSum: 0, placeCount: 0 },
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

    players.forEach((p, idx) => {
      const a = acc[bucketAt(idx, n)];
      a.games += 1;

      if (p.isWinner) {
        a.wins += 1;
      }

      if (ranks) {
        a.placeSum += ranks.get(p.playerId) as number;
        a.placeCount += 1;
      }
    });
  }

  const order: SeatBucket[] = ["first", "middle", "last"];

  return order.map(bucket => {
    const a = acc[bucket];

    return {
      bucket,
      games: a.games,
      winRate: a.games > 0 ? a.wins / a.games : null,
      avgPlacement: a.placeCount > 0 ? a.placeSum / a.placeCount : null,
    };
  });
}
