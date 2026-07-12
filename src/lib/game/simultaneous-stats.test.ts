import { describe, expect, it } from "vitest";

import type {
  GameId,
  GamePlayer,
  GameTurn,
  GameTurnId,
  PlayerId,
} from "@/lib/domain";
import { computeSimultaneousStats } from "./simultaneous-stats";

const gid = "g" as GameId;

function player(id: string, name: string) {
  return {
    gameId: gid,
    playerId: id as PlayerId,
    seatOrder: 0,
    isWinner: false,
    score: null,
    scoreBreakdown: null,
    player: { id: id as PlayerId, name },
  } as GamePlayer & { player: { id: PlayerId; name: string } };
}

function round(
  round: number,
  durationS: number,
  blockedBy?: string,
  waitedS = 0,
): GameTurn {
  return {
    id: `t-${round}` as GameTurnId,
    gameId: gid,
    playerId: null,
    blockedById: (blockedBy ?? null) as PlayerId | null,
    waitedS,
    round,
    turnNo: round,
    durationS,
    pauseCount: 0,
    pauseDurationS: 0,
    overtimeS: 0,
  };
}

const players = [player("a", "Alice"), player("b", "Bob")];

describe("computeSimultaneousStats", () => {
  it("summarises per-round times and the total", () => {
    const stats = computeSimultaneousStats({
      players,
      turns: [round(2, 40), round(1, 30), round(3, 50)],
    });

    expect(stats.totalS).toBe(120);
    expect(stats.roundCount).toBe(3);
    // Sorted into play order.
    expect(stats.rounds.map(r => r.round)).toEqual([1, 2, 3]);
    expect(stats.longestRound).toEqual({ round: 3, durationS: 50 });
  });

  it("tallies who the table waited on — count + total time, most first", () => {
    const stats = computeSimultaneousStats({
      players,
      turns: [
        round(1, 30, "a", 10),
        round(2, 40, "b", 8),
        round(3, 50, "a", 15),
        round(4, 20),
      ],
    });

    expect(stats.waited).toEqual([
      { playerId: "a", name: "Alice", count: 2, totalS: 25 },
      { playerId: "b", name: "Bob", count: 1, totalS: 8 },
    ]);
    expect(stats.mostWaited).toEqual({
      playerId: "a",
      name: "Alice",
      count: 2,
      totalS: 25,
    });
  });

  it("breaks equal counts by the longer total wait", () => {
    const stats = computeSimultaneousStats({
      players,
      // Both waited once; Bob's wait was longer → Bob first.
      turns: [round(1, 30, "a", 5), round(2, 30, "b", 20)],
    });

    expect(stats.waited.map(w => w.name)).toEqual(["Bob", "Alice"]);
  });

  it("is empty and waitless for no turns", () => {
    const stats = computeSimultaneousStats({ players, turns: [] });

    expect(stats.totalS).toBe(0);
    expect(stats.roundCount).toBe(0);
    expect(stats.longestRound).toBeNull();
    expect(stats.waited).toEqual([]);
    expect(stats.mostWaited).toBeNull();
  });

  it("falls back to '?' for an unknown blocked player", () => {
    const stats = computeSimultaneousStats({
      players,
      turns: [round(1, 30, "zzz")],
    });

    expect(stats.mostWaited).toEqual({
      playerId: "zzz",
      name: "?",
      count: 1,
      totalS: 0,
    });
  });
});
