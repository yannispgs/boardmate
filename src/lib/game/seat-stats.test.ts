import { describe, expect, it } from "vitest";

import type { GameStatsRecord, PlayerId } from "@/lib/domain";
import {
  computeSeatStats,
  type SeatBucket,
  seatOrderMatters,
} from "./seat-stats";

describe("seatOrderMatters", () => {
  it("holds when players take turns", () => {
    expect(seatOrderMatters("sequential")).toBe(true);
  });

  it("fails when everybody plays at once", () => {
    expect(seatOrderMatters("simultaneous")).toBe(false);
  });
});

type P = { seat: number; winner?: boolean; score?: number | null };

/** A minimal stats record carrying only what seat stats read. */
function rec(players: P[]): GameStatsRecord {
  return {
    gameId: "g" as never,
    boardgameId: "b" as never,
    boardgameName: "Catan",
    dice: null,
    endedAt: "2026-01-01T00:00:00Z",
    players: players.map((p, i) => ({
      playerId: `p${i}` as PlayerId,
      name: `P${i}`,
      seatOrder: p.seat,
      isWinner: p.winner ?? false,
      score: p.score ?? null,
    })),
    turns: [],
    diceRolls: [],
  };
}

function byBucket(records: GameStatsRecord[]) {
  const stats = computeSeatStats(records, "highest");
  const map = {} as Record<SeatBucket, (typeof stats)[number]>;

  for (const s of stats) {
    map[s.bucket] = s;
  }

  return map;
}

describe("computeSeatStats", () => {
  it("returns the three buckets even with no games", () => {
    const stats = computeSeatStats([], "highest");

    expect(stats.map(s => s.bucket)).toEqual(["first", "middle", "last"]);
    expect(stats.every(s => s.games === 0)).toBe(true);
    expect(stats.every(s => s.winRate === null)).toBe(true);
    expect(stats.every(s => s.avgPosition === null)).toBe(true);
  });

  it("buckets by turn order (sorted by seat) and computes win rate", () => {
    // Two 3-player games. First wins one; last wins the other.
    const games = [
      rec([
        { seat: 0, winner: true, score: 10 },
        { seat: 1, score: 8 },
        { seat: 2, score: 6 },
      ]),
      // Seats given out of order to prove the sort.
      rec([
        { seat: 2, winner: true, score: 11 },
        { seat: 0, score: 9 },
        { seat: 1, score: 7 },
      ]),
    ];
    const map = byBucket(games);

    expect(map.first.games).toBe(2);
    expect(map.middle.games).toBe(2);
    expect(map.last.games).toBe(2);
    expect(map.first.winRate).toBe(0.5);
    expect(map.last.winRate).toBe(0.5);
    expect(map.middle.winRate).toBe(0);

    // Relative position (rank−1)/(n−1), n=3: first 1st(0) then 2nd(0.5) → 0.25;
    // middle 2nd(0.5) then 3rd(1) → 0.75; last 3rd(1) then 1st(0) → 0.5.
    expect(map.first.avgPosition).toBe(0.25);
    expect(map.last.avgPosition).toBe(0.5);
    expect(map.middle.avgPosition).toBe(0.75);
  });

  it("ranks lowest-wins games the other way and shares ranks on ties", () => {
    const stats = computeSeatStats(
      [
        rec([
          { seat: 0, winner: true, score: 3 },
          { seat: 1, score: 3 }, // tie for the lead
          { seat: 2, score: 9 },
        ]),
      ],
      "lowest",
    );
    const map = {} as Record<SeatBucket, (typeof stats)[number]>;

    for (const s of stats) {
      map[s.bucket] = s;
    }

    // Lowest wins: the two 3s share rank 1 (position 0), the 9 is rank 3 (1).
    expect(map.first.avgPosition).toBe(0);
    expect(map.middle.avgPosition).toBe(0);
    expect(map.last.avgPosition).toBe(1);
  });

  it("counts win rate but skips placement when a score is missing", () => {
    const map = byBucket([
      rec([
        { seat: 0, winner: true, score: null },
        { seat: 1, score: null },
      ]),
    ]);

    // Two players → first and last, no middle.
    expect(map.first.games).toBe(1);
    expect(map.last.games).toBe(1);
    expect(map.middle.games).toBe(0);
    expect(map.first.winRate).toBe(1);
    expect(map.last.winRate).toBe(0);
    // No scores → no placement, and the empty middle bucket stays null.
    expect(map.first.avgPosition).toBeNull();
    expect(map.middle.winRate).toBeNull();
    expect(map.middle.avgPosition).toBeNull();
  });

  it("maps a lone scored player to position 0 (best, avoids /0)", () => {
    const map = byBucket([rec([{ seat: 0, winner: true, score: 5 }])]);

    // Single player → only the "first" bucket, relative position 0.
    expect(map.first.avgPosition).toBe(0);
    expect(map.middle.avgPosition).toBeNull();
    expect(map.last.avgPosition).toBeNull();
  });

  it("ignores a record with no players", () => {
    const stats = computeSeatStats([rec([])], "highest");

    expect(stats.every(s => s.games === 0)).toBe(true);
  });
});
