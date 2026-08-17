import { describe, expect, it } from "vitest";

import type { GameStatsRecord, PlayerId } from "@/lib/domain";

import { computeZeroFinishes } from "./zero-finishes";

const A = "a" as PlayerId;
const B = "b" as PlayerId;
const C = "c" as PlayerId;

const NAMES: Record<string, string> = { a: "Alice", b: "Bob", c: "Chloé" };

/** One party, given as the final score of each player who sat at the table. */
function record(scores: Array<[PlayerId, number | null]>): GameStatsRecord {
  return {
    gameId: "g" as GameStatsRecord["gameId"],
    boardgameId: "b" as GameStatsRecord["boardgameId"],
    boardgameName: "Papayoo",
    dice: null,
    endedAt: "2026-08-16T20:00:00.000Z",
    players: scores.map(([playerId, score], i) => ({
      playerId,
      name: NAMES[playerId],
      seatOrder: i,
      isWinner: false,
      score,
    })),
    turns: [],
    diceRolls: [],
    stageScores: [],
  };
}

describe("computeZeroFinishes", () => {
  it("counts the parties each player walked away from at nothing", () => {
    const stats = computeZeroFinishes([
      record([
        [A, 0],
        [B, 130],
        [C, 120],
      ]),
      record([
        [A, 40],
        [B, 0],
        [C, 210],
      ]),
    ]);

    expect(stats).toHaveLength(3);
    expect(stats.find(s => s.playerId === A)).toEqual({
      playerId: A,
      name: "Alice",
      games: 2,
      zeroes: 1,
      rate: 0.5,
    });
  });

  it("ranks the cleanest player first", () => {
    const stats = computeZeroFinishes([
      record([
        [A, 0],
        [B, 250],
      ]),
      record([
        [A, 0],
        [B, 250],
      ]),
      record([
        [A, 250],
        [B, 0],
      ]),
    ]);

    expect(stats.map(s => s.playerId)).toEqual([A, B]);
    expect(stats[0].rate).toBeCloseTo(2 / 3);
    expect(stats[1].rate).toBeCloseTo(1 / 3);
  });

  it("leaves a party out of the count when the score was never recorded", () => {
    const stats = computeZeroFinishes([
      record([
        [A, null],
        [B, 250],
      ]),
      record([
        [A, 0],
        [B, 250],
      ]),
    ]);

    // A missing score is not a zero: Alice is read on the one party she has.
    expect(stats.find(s => s.playerId === A)).toMatchObject({
      games: 1,
      zeroes: 1,
      rate: 1,
    });
  });

  it("says nothing at all when no party recorded a score", () => {
    expect(computeZeroFinishes([])).toEqual([]);
    expect(
      computeZeroFinishes([
        record([
          [A, null],
          [B, null],
        ]),
      ]),
    ).toEqual([]);
  });
});
