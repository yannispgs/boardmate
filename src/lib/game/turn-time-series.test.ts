import { describe, expect, it } from "vitest";

import type { GameId, GameTurn, GameTurnId, PlayerId } from "@/lib/domain";

import { buildTurnTimeSeries } from "./turn-time-series";

const gid = "g" as GameId;
const p = (n: string) => n as PlayerId;

function turn(playerId: string, round: number, durationS: number): GameTurn {
  return {
    id: `${playerId}-${round}` as GameTurnId,
    gameId: gid,
    playerId: p(playerId),
    round,
    turnNo: round,
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

    const { series, maxSeconds, maxTour } = buildTurnTimeSeries(turns, [
      p("a"),
      p("b"),
    ]);

    expect(maxTour).toBe(2);
    expect(maxSeconds).toBe(45);
    expect(series.find(s => s.playerId === "a")?.points).toEqual([
      { tour: 1, seconds: 30 },
      { tour: 2, seconds: 45 },
    ]);
    expect(series.find(s => s.playerId === "b")?.points).toEqual([
      { tour: 1, seconds: 10 },
      { tour: 2, seconds: 12 },
    ]);
  });

  it("sorts a player's turns by tour regardless of input order", () => {
    const { series } = buildTurnTimeSeries(
      [turn("a", 3, 5), turn("a", 1, 9)],
      [p("a")],
    );

    expect(series[0].points.map(pt => pt.tour)).toEqual([1, 3]);
  });

  it("is safe with no turns (empty lines, floors the max at 1)", () => {
    const { series, maxSeconds, maxTour } = buildTurnTimeSeries([], [p("a")]);

    expect(maxTour).toBe(0);
    expect(maxSeconds).toBe(1);
    expect(series[0].points).toEqual([]);
  });
});
