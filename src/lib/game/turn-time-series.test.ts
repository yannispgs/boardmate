import { describe, expect, it } from "vitest";

import type { GameId, GameTurn, GameTurnId, PlayerId } from "@/lib/domain";

import { buildTurnTimeSeries } from "./turn-time-series";

const gid = "g" as GameId;
const p = (n: string) => n as PlayerId;

let turnNo = 0;

function turn(playerId: string, round: number, durationS: number): GameTurn {
  turnNo += 1;

  return {
    id: `${playerId}-${turnNo}` as GameTurnId,
    gameId: gid,
    playerId: p(playerId),
    blockedById: null,
    waitedS: 0,
    round,
    turnNo,
    stage: null,
    durationS,
    pauseCount: 0,
    pauseDurationS: 0,
    overtimeS: 0,
  };
}

describe("buildTurnTimeSeries", () => {
  it("builds a pace line per player with the maxima", () => {
    const turns = [
      turn("a", 1, 30),
      turn("b", 1, 10),
      turn("a", 2, 45),
      turn("b", 2, 12),
    ];

    const { series, maxSeconds, maxRound } = buildTurnTimeSeries(turns, [
      p("a"),
      p("b"),
    ]);

    expect(maxRound).toBe(2);
    expect(maxSeconds).toBe(45);
    expect(series.find(s => s.playerId === "a")?.points).toEqual([
      { round: 1, seconds: 30 },
      { round: 2, seconds: 45 },
    ]);
    expect(series.find(s => s.playerId === "b")?.points).toEqual([
      { round: 1, seconds: 10 },
      { round: 2, seconds: 12 },
    ]);
  });

  it("averages the several turns a generation gives one player", () => {
    const { series, maxSeconds } = buildTurnTimeSeries(
      [
        turn("a", 1, 30),
        turn("a", 1, 60),
        turn("a", 1, 90),
        turn("a", 2, 20),
        turn("a", 2, 40),
      ],
      [p("a")],
    );

    expect(series[0].points).toEqual([
      { round: 1, seconds: 60 },
      { round: 2, seconds: 30 },
    ]);
    // The 90 s turn is inside an average, so it is not what the chart scales to.
    expect(maxSeconds).toBe(60);
  });

  it("sorts a player's rounds regardless of input order", () => {
    const { series } = buildTurnTimeSeries(
      [turn("a", 3, 5), turn("a", 1, 9)],
      [p("a")],
    );

    expect(series[0].points.map(pt => pt.round)).toEqual([1, 3]);
  });

  it("is safe with no turns (empty lines, floors the max at 1)", () => {
    const { series, maxSeconds, maxRound } = buildTurnTimeSeries([], [p("a")]);

    expect(maxRound).toBe(0);
    expect(maxSeconds).toBe(1);
    expect(series[0].points).toEqual([]);
  });
});
