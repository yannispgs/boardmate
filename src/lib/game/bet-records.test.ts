import { describe, expect, it } from "vitest";

import type { GameId, GameStatsRecord, PlayerId } from "@/lib/domain";

import { betStreakMarks, betsWonMarks } from "./bet-records";

const A = "a" as PlayerId;
const B = "b" as PlayerId;

function party(
  id: string,
  endedAt: string | null,
  lines: Array<[PlayerId, number, number]>,
): GameStatsRecord {
  return {
    gameId: id as GameId,
    endedAt,
    players: [
      { playerId: A, name: "Ann" },
      { playerId: B, name: "Bob" },
    ],
    stageScores: lines.map(([playerId, stage, points]) => ({
      stage,
      playerId,
      points,
    })),
  } as GameStatsRecord;
}

describe("betsWonMarks", () => {
  it("counts each player's won bets, and skips a party with no detail", () => {
    expect(
      betsWonMarks(
        party("p", null, [
          [A, 1, 10],
          [A, 2, -5],
          [A, 3, 15],
          [B, 1, -10],
        ]),
      ),
    ).toEqual([
      { playerId: A, value: 2, stage: null },
      { playerId: B, value: 0, stage: null },
    ]);
    expect(
      betsWonMarks({ ...party("p", null, []), stageScores: undefined }),
    ).toEqual([]);
  });
});

describe("betStreakMarks", () => {
  it("carries a run from one party into the next, in the order played", () => {
    // Ann wins the last two of the first party, then the first three of the
    // second (played later, listed first): a run of five, read on the second.
    const second = party("second", "2026-10-02T20:00:00Z", [
      [A, 2, 20],
      [A, 1, 10],
      [A, 3, 30],
      [A, 4, -5],
    ]);
    const first = party("first", "2026-10-01T20:00:00Z", [
      [A, 1, -5],
      [A, 2, 20],
      [A, 3, 15],
      [B, 1, 10],
    ]);
    const blank = party("blank", "2026-10-01T22:00:00Z", []);
    const live = party("live", null, [
      [A, 1, 10],
      [B, 1, 10],
    ]);

    expect(betStreakMarks([live, second, blank, first])).toEqual([
      { gameId: "first", playerId: A, value: 2, stage: null },
      { gameId: "first", playerId: B, value: 1, stage: null },
      { gameId: "second", playerId: A, value: 5, stage: null },
      { gameId: "live", playerId: A, value: 1, stage: null },
      { gameId: "live", playerId: B, value: 2, stage: null },
    ]);
  });
});
