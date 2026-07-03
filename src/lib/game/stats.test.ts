import { describe, expect, it } from "vitest";

import type {
  GameId,
  GamePlayer,
  GameTurn,
  GameTurnId,
  PlayerId,
} from "@/lib/domain";

import { computeGameStats } from "./stats";

const gid = "g1" as GameId;

function player(
  id: string,
  name: string,
  seatOrder: number,
  isWinner = false,
): GamePlayer & { player: { id: PlayerId; name: string } } {
  const pid = id as PlayerId;

  return {
    gameId: gid,
    playerId: pid,
    seatOrder,
    isWinner,
    player: { id: pid, name },
  };
}

function turn(
  playerId: string,
  round: number,
  turnNo: number,
  durationS: number,
): GameTurn {
  return {
    id: `${playerId}-${turnNo}` as GameTurnId,
    gameId: gid,
    playerId: playerId as PlayerId,
    round,
    turnNo,
    durationS,
  };
}

describe("computeGameStats", () => {
  it("aggregates active time, counts and per-player shares", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0, true), player("b", "Bob", 1)],
      turns: [
        turn("a", 1, 1, 30),
        turn("b", 1, 2, 10),
        turn("a", 2, 3, 30),
        turn("b", 2, 4, 30),
      ],
      startedAt: "2026-07-01T20:00:00.000Z",
      endedAt: "2026-07-01T20:02:00.000Z", // 120s wall clock
    });

    expect(stats.activeTotalS).toBe(100);
    expect(stats.turnCount).toBe(4);
    expect(stats.rounds).toBe(2);
    expect(stats.avgRoundS).toBe(50); // 100s active / 2 rounds
    expect(stats.realDurationS).toBe(120);
    expect(stats.offTurnS).toBe(20); // 120 - 100

    const alice = stats.players.find(p => p.name === "Alice");

    expect(alice?.totalS).toBe(60);
    expect(alice?.turnCount).toBe(2);
    expect(alice?.avgS).toBe(30);
    expect(alice?.minS).toBe(30);
    expect(alice?.maxS).toBe(30);
    expect(alice?.sharePct).toBe(60);
    expect(alice?.isWinner).toBe(true);
  });

  it("sorts players fastest mean first and reports the longest turn", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0), player("b", "Bob", 1)],
      turns: [turn("a", 1, 1, 40), turn("b", 1, 2, 5), turn("b", 2, 3, 15)],
      startedAt: "2026-07-01T20:00:00.000Z",
      endedAt: "2026-07-01T20:01:00.000Z",
    });

    // Bob averages 10s, Alice 40s → Bob first.
    expect(stats.players.map(p => p.name)).toEqual(["Bob", "Alice"]);
    expect(stats.longestTurn).toEqual({
      playerId: "a",
      name: "Alice",
      durationS: 40,
      round: 1,
    });
  });

  it("handles a game with no turns and turn-less players", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0), player("b", "Bob", 1)],
      turns: [],
      startedAt: "2026-07-01T20:00:00.000Z",
      endedAt: "2026-07-01T20:00:30.000Z",
    });

    expect(stats.activeTotalS).toBe(0);
    expect(stats.turnCount).toBe(0);
    expect(stats.rounds).toBe(0);
    expect(stats.avgRoundS).toBe(0);
    expect(stats.longestTurn).toBeNull();
    expect(stats.offTurnS).toBe(30);
    expect(stats.players.every(p => p.avgS === 0 && p.minS === null)).toBe(
      true,
    );
    expect(stats.players.every(p => p.sharePct === 0)).toBe(true);
  });

  it("leaves real duration and off-turn null when the game has no end", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0)],
      turns: [turn("a", 1, 1, 12)],
      startedAt: "2026-07-01T20:00:00.000Z",
      endedAt: null,
    });

    expect(stats.realDurationS).toBeNull();
    expect(stats.offTurnS).toBeNull();
    expect(stats.activeTotalS).toBe(12);
  });

  it("sinks players who never played to the bottom", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0), player("b", "Bob", 1)],
      turns: [turn("a", 1, 1, 20)],
      startedAt: "2026-07-01T20:00:00.000Z",
      endedAt: "2026-07-01T20:00:20.000Z",
    });

    expect(stats.players.map(p => p.name)).toEqual(["Alice", "Bob"]);
  });

  it("falls back to '?' when the longest turn's player is off the roster", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0)],
      // A turn by a player not in the roster (defensive: shouldn't happen, but
      // the name lookup must not crash).
      turns: [turn("ghost", 1, 1, 99)],
      startedAt: "2026-07-01T20:00:00.000Z",
      endedAt: "2026-07-01T20:01:39.000Z",
    });

    expect(stats.longestTurn?.name).toBe("?");
  });
});
