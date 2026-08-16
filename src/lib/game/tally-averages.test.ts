import { describe, expect, it } from "vitest";

import type { GameStatsRecord, PlayerId, StageScore } from "@/lib/domain";

import {
  computeTallyAverages,
  computeTallyExits,
  tallyPointsBucket,
  tallyPointsHistogram,
} from "./tally-averages";

const A = "a" as PlayerId;
const B = "b" as PlayerId;

function record(
  stageScores: StageScore[] | undefined,
  winner: { playerId: PlayerId; score: number | null } | null = null,
): GameStatsRecord {
  return {
    gameId: "g" as GameStatsRecord["gameId"],
    boardgameId: "b" as GameStatsRecord["boardgameId"],
    boardgameName: "Odin",
    dice: null,
    endedAt: null,
    players: [
      {
        playerId: A,
        name: "Alice",
        seatOrder: 0,
        isWinner: winner?.playerId === A,
        score: winner?.playerId === A ? winner.score : 20,
      },
      {
        playerId: B,
        name: "Bob",
        seatOrder: 1,
        isWinner: winner?.playerId === B,
        score: winner?.playerId === B ? winner.score : 20,
      },
    ],
    turns: [],
    diceRolls: [],
    stageScores,
  };
}

/** Two manches: Alice goes out on the first, Bob on the second. */
const TWO_STAGES: StageScore[] = [
  { stage: 1, playerId: A, points: 0 },
  { stage: 1, playerId: B, points: 4 },
  { stage: 2, playerId: A, points: 6 },
  { stage: 2, playerId: B, points: 0 },
];

describe("computeTallyAverages", () => {
  it("has no reference to offer without a party to average", () => {
    expect(computeTallyAverages([])).toBeNull();
  });

  it("ignores a party that recorded no manche at all", () => {
    expect(computeTallyAverages([record([]), record(undefined)])).toBeNull();
  });

  it("averages the manches, the winning score and what a manche costs", () => {
    const averages = computeTallyAverages([
      record(TWO_STAGES, { playerId: A, score: 12 }),
      record([...TWO_STAGES, { stage: 3, playerId: A, points: 0 }], {
        playerId: B,
        score: 16,
      }),
    ]);

    expect(averages).toEqual({
      games: 2,
      avgStages: 2.5,
      avgWinnerScore: 14,
      avgPointsPerStage: 20 / 5,
    });
  });

  it("leaves the winning score out when no party recorded one", () => {
    expect(
      computeTallyAverages([record(TWO_STAGES)])?.avgWinnerScore,
    ).toBeNull();
  });
});

describe("computeTallyExits", () => {
  it("counts each player's exits over the parties, best rate first", () => {
    const stats = computeTallyExits([
      record(TWO_STAGES),
      record([
        { stage: 1, playerId: A, points: 0 },
        { stage: 1, playerId: B, points: 2 },
      ]),
    ]);

    expect(stats.map(s => s.name)).toEqual(["Alice", "Bob"]);
    expect(stats[0]).toMatchObject({
      playerId: A,
      stages: 3,
      exits: 2,
      rate: 2 / 3,
      avgCaught: 6,
    });
    expect(stats[1]).toMatchObject({ exits: 1, avgCaught: 3 });
  });

  it("has no average cost for a player who always went out", () => {
    const stats = computeTallyExits([
      record([{ stage: 1, playerId: A, points: 0 }]),
    ]);

    expect(stats[0].avgCaught).toBeNull();
  });

  it("has nothing to rank when no manche was recorded", () => {
    expect(computeTallyExits([record(undefined)])).toEqual([]);
  });
});

describe("tallyPointsBucket", () => {
  it("gives a bar of its own to every point of a small manche", () => {
    expect(tallyPointsBucket(9)).toBe(1);
    expect(tallyPointsBucket(10)).toBe(1);
  });

  it("widens the bars until a heavy manche fits in ten of them", () => {
    expect(tallyPointsBucket(250)).toBe(25);
    expect(tallyPointsBucket(11)).toBe(2);
  });

  it("counts in single points when the rules cap nothing", () => {
    expect(tallyPointsBucket(null)).toBe(1);
  });
});

describe("tallyPointsHistogram", () => {
  it("has no bar to draw without a manche", () => {
    expect(tallyPointsHistogram([record(undefined)])).toEqual([]);
  });

  it("counts every cost from the exit up to the heaviest, gaps included", () => {
    expect(tallyPointsHistogram([record(TWO_STAGES)])).toEqual([
      { points: 0, upTo: 0, count: 2 },
      { points: 1, upTo: 1, count: 0 },
      { points: 2, upTo: 2, count: 0 },
      { points: 3, upTo: 3, count: 0 },
      { points: 4, upTo: 4, count: 1 },
      { points: 5, upTo: 5, count: 0 },
      { points: 6, upTo: 6, count: 1 },
    ]);
  });

  it("gathers the costs into ranges, leaving the manches at 0 alone", () => {
    expect(tallyPointsHistogram([record(TWO_STAGES)], 4)).toEqual([
      { points: 0, upTo: 0, count: 2 },
      { points: 1, upTo: 4, count: 1 },
      { points: 5, upTo: 8, count: 1 },
    ]);
  });
});
