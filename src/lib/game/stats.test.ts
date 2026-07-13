import { describe, expect, it } from "vitest";

import type {
  GameId,
  GamePlayer,
  GameTurn,
  GameTurnId,
  PlayerId,
} from "@/lib/domain";

import { computeGameStats, liveTimeHog, timeHog } from "./stats";

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
    score: null,
    scoreBreakdown: null,
    player: { id: pid, name },
  };
}

function turn(
  playerId: string,
  round: number,
  turnNo: number,
  durationS: number,
  pauseCount = 0,
  pauseDurationS = 0,
  overtimeS = 0,
): GameTurn {
  return {
    id: `${playerId}-${turnNo}` as GameTurnId,
    gameId: gid,
    playerId: playerId as PlayerId,
    blockedById: null,
    waitedS: 0,
    round,
    turnNo,
    durationS,
    pauseCount,
    pauseDurationS,
    overtimeS,
  };
}

describe("computeGameStats", () => {
  it("aggregates active time, counts, shares and pauses", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0, true), player("b", "Bob", 1)],
      turns: [
        turn("a", 1, 1, 30, 1, 8, 5),
        turn("b", 1, 2, 10),
        turn("a", 2, 3, 30, 2, 20, 3),
        turn("b", 2, 4, 30, 1, 6),
      ],
    });

    expect(stats.activeTotalS).toBe(100);
    expect(stats.turnCount).toBe(4);
    expect(stats.rounds).toBe(2);
    expect(stats.avgRoundS).toBe(50); // 100s active / 2 rounds

    expect(stats.totalPauseCount).toBe(4); // 1 + 0 + 2 + 1
    expect(stats.totalPauseS).toBe(34); // 8 + 0 + 20 + 6
    // Alice paused most during her own turns.
    expect(stats.mostPaused).toEqual({
      playerId: "a",
      name: "Alice",
      durationS: 28,
      count: 3,
    });

    // Only Alice ran over her time (5 + 3 s).
    expect(stats.totalOvertimeS).toBe(8);
    expect(stats.mostOvertime).toEqual({
      playerId: "a",
      name: "Alice",
      overtimeS: 8,
    });

    const alice = stats.players.find(p => p.name === "Alice");

    expect(alice?.totalS).toBe(60);
    expect(alice?.turnCount).toBe(2);
    expect(alice?.avgS).toBe(30);
    expect(alice?.minS).toBe(30);
    expect(alice?.maxS).toBe(30);
    expect(alice?.sharePct).toBe(60);
    expect(alice?.isWinner).toBe(true);
    expect(alice?.pauseS).toBe(28);
    expect(alice?.pauseCount).toBe(3);
    expect(alice?.overtimeS).toBe(8);
  });

  it("sorts players fastest mean first and reports the longest turn", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0), player("b", "Bob", 1)],
      turns: [turn("a", 1, 1, 40), turn("b", 1, 2, 5), turn("b", 2, 3, 15)],
    });

    // Bob averages 10s, Alice 40s → Bob first.
    expect(stats.players.map(p => p.name)).toEqual(["Bob", "Alice"]);
    expect(stats.longestTurn).toEqual({
      playerId: "a",
      name: "Alice",
      durationS: 40,
      round: 1,
    });
    // Nobody paused or ran over → no top pauser / overrunner.
    expect(stats.mostPaused).toBeNull();
    expect(stats.totalPauseS).toBe(0);
    expect(stats.mostOvertime).toBeNull();
    expect(stats.totalOvertimeS).toBe(0);
  });

  it("handles a game with no turns and turn-less players", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0), player("b", "Bob", 1)],
      turns: [],
    });

    expect(stats.activeTotalS).toBe(0);
    expect(stats.turnCount).toBe(0);
    expect(stats.rounds).toBe(0);
    expect(stats.avgRoundS).toBe(0);
    expect(stats.longestTurn).toBeNull();
    expect(stats.mostPaused).toBeNull();
    expect(stats.mostOvertime).toBeNull();
    expect(stats.totalPauseCount).toBe(0);
    expect(stats.totalOvertimeS).toBe(0);
    expect(stats.players.every(p => p.avgS === 0 && p.minS === null)).toBe(
      true,
    );
    expect(stats.players.every(p => p.sharePct === 0)).toBe(true);
  });

  it("sinks players who never played to the bottom", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0), player("b", "Bob", 1)],
      turns: [turn("a", 1, 1, 20)],
    });

    expect(stats.players.map(p => p.name)).toEqual(["Alice", "Bob"]);
  });

  it("falls back to '?' when the longest turn's player is off the roster", () => {
    const stats = computeGameStats({
      players: [player("a", "Alice", 0)],
      // A turn by a player not in the roster (defensive: shouldn't happen, but
      // the name lookup must not crash).
      turns: [turn("ghost", 1, 1, 99)],
    });

    expect(stats.longestTurn?.name).toBe("?");
  });
});

describe("timeHog", () => {
  const p = (name: string, sharePct: number, turnCount = 1) => ({
    name,
    sharePct,
    turnCount,
  });

  it("flags a player clearly above an even split", () => {
    // 3 players → even share 33%; 1.6× = ~53%. Alice at 60% is over.
    expect(timeHog([p("Alice", 60), p("Bob", 25), p("Cara", 15)])).toEqual({
      name: "Alice",
      sharePct: 60,
    });
  });

  it("flags the hog even when they are not first in the list", () => {
    // The leader sits mid-list, so the scan must switch to a later player.
    expect(timeHog([p("Bob", 25), p("Alice", 60), p("Cara", 15)])).toEqual({
      name: "Alice",
      sharePct: 60,
    });
  });

  it("returns null when the leader is near an even split", () => {
    expect(timeHog([p("Alice", 40), p("Bob", 35), p("Cara", 25)])).toBeNull();
  });

  it("needs at least two players who have played", () => {
    expect(timeHog([p("Alice", 100), p("Bob", 0, 0)])).toBeNull();
    expect(timeHog([])).toBeNull();
  });
});

describe("liveTimeHog", () => {
  it("ignores the in-progress round so a mid-round leader isn't flagged", () => {
    const players = [
      player("a", "Alice", 0),
      player("b", "Bob", 1),
      player("c", "Cara", 2),
    ];
    // Round 1 is complete and even (20/20/20). In round 2 only Alice has
    // played, a big 40s turn — she's simply a turn ahead of the table.
    const turns = [
      turn("a", 1, 1, 20),
      turn("b", 1, 2, 20),
      turn("c", 1, 3, 20),
      turn("a", 2, 4, 40),
    ];

    // Over ALL turns Alice holds 60% (> the ~53% threshold) → the naive
    // computation flags her. Judged on the completed round 1, it's even.
    expect(timeHog(computeGameStats({ players, turns }).players)?.name).toBe(
      "Alice",
    );
    expect(liveTimeHog(players, turns, 2)).toBeNull();
  });

  it("flags a hog once the round it's in is complete", () => {
    const players = [player("a", "Alice", 0), player("b", "Bob", 1)];
    const turns = [turn("a", 1, 1, 60), turn("b", 1, 2, 10)];

    // Round 1 is complete (both played) and lopsided; round 2 is in progress.
    const hog = liveTimeHog(players, turns, 2);

    expect(hog?.name).toBe("Alice");
    expect(hog?.sharePct).toBeCloseTo((60 / 70) * 100);
  });

  it("shows no hog while the first round is still in progress", () => {
    const players = [player("a", "Alice", 0), player("b", "Bob", 1)];
    const turns = [turn("a", 1, 1, 60)];

    expect(liveTimeHog(players, turns, 1)).toBeNull();
  });
});
