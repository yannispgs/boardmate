import { describe, expect, it } from "vitest";

import type { PlayerId, StageScore } from "@/lib/domain";

import {
  buildStageTotalsSeries,
  computeTallyStats,
  type TallyPlayer,
} from "./tally-stats";

const A = "a" as PlayerId;
const B = "b" as PlayerId;
const C = "c" as PlayerId;

const PLAYERS: TallyPlayer[] = [
  { playerId: A, name: "Alice" },
  { playerId: B, name: "Bob" },
  { playerId: C, name: "Chloé" },
];

/** A manche: who went out (0) and what the others were caught holding. */
function stage(nb: number, points: [number, number, number]): StageScore[] {
  return [A, B, C].map((playerId, i) => ({
    stage: nb,
    playerId,
    points: points[i],
  }));
}

// Three manches: Alice goes out twice, Bob once, Chloé never — and Chloé takes
// the whole hand on the last one.
const SCORES: StageScore[] = [
  ...stage(1, [0, 3, 5]),
  ...stage(2, [4, 0, 2]),
  ...stage(3, [0, 1, 9]),
];

describe("computeTallyStats", () => {
  it("counts the manches actually written down", () => {
    const stats = computeTallyStats({
      players: PLAYERS,
      scores: SCORES,
      target: null,
    });

    expect(stats.stageCount).toBe(3);
    expect(stats.avgPointsPerStage).toBeCloseTo(24 / 3);
  });

  it("has nothing to say about a game with no manche", () => {
    const stats = computeTallyStats({
      players: PLAYERS,
      scores: [],
      target: 15,
    });

    expect(stats.stageCount).toBe(0);
    expect(stats.avgPointsPerStage).toBeNull();
    expect(stats.worstStage).toBeNull();
    expect(stats.fatalStage).toBeNull();
  });

  it("counts each player's exits, what the rest cost them, and their total", () => {
    const stats = computeTallyStats({
      players: PLAYERS,
      scores: SCORES,
      target: null,
    });
    const alice = stats.players.find(p => p.playerId === A);

    expect(alice).toMatchObject({
      exits: 2,
      caught: 1,
      caughtPoints: 4,
      avgCaught: 4,
      worst: 4,
      total: 4,
    });
    expect(stats.players.find(p => p.playerId === C)).toMatchObject({
      exits: 0,
      caught: 3,
      avgCaught: 16 / 3,
      worst: 9,
      total: 16,
    });
  });

  it("ranks the players by exits, then by what a manche costs them", () => {
    const stats = computeTallyStats({
      players: PLAYERS,
      scores: SCORES,
      target: null,
    });

    expect(stats.players.map(p => p.name)).toEqual(["Alice", "Bob", "Chloé"]);
  });

  it("puts a player who never got caught ahead of one who did", () => {
    const stats = computeTallyStats({
      players: [
        { playerId: A, name: "Alice" },
        { playerId: B, name: "Bob" },
      ],
      scores: [
        { stage: 1, playerId: A, points: 2 },
        { stage: 1, playerId: B, points: 0 },
        { stage: 2, playerId: A, points: 0 },
        { stage: 2, playerId: B, points: 0 },
      ],
      target: null,
    });

    expect(stats.players.map(p => p.name)).toEqual(["Bob", "Alice"]);
    expect(stats.players[0].avgCaught).toBeNull();
  });

  it("names the heaviest manche of the game", () => {
    const stats = computeTallyStats({
      players: PLAYERS,
      scores: SCORES,
      target: null,
    });

    expect(stats.worstStage).toEqual({
      playerId: C,
      name: "Chloé",
      stage: 3,
      points: 9,
    });
  });

  it("has no heaviest manche when everybody went out at nothing", () => {
    const stats = computeTallyStats({
      players: PLAYERS,
      scores: stage(1, [0, 0, 0]),
      target: null,
    });

    expect(stats.worstStage).toBeNull();
  });

  it("finds the manche a total first reached the target on", () => {
    const stats = computeTallyStats({
      players: PLAYERS,
      scores: SCORES,
      target: 7,
    });

    // Chloé is at 7 after manche 2; nobody crossed on manche 1.
    expect(stats.fatalStage).toEqual({ stage: 2, names: ["Chloé"] });
  });

  it("names everybody who crossed on the same manche", () => {
    const stats = computeTallyStats({
      players: PLAYERS,
      scores: SCORES,
      target: 3,
    });

    // Manche 1 leaves Bob on 3 and Chloé on 5 — both at or past the target.
    expect(stats.fatalStage).toEqual({ stage: 1, names: ["Bob", "Chloé"] });
  });

  it("leaves the fatal manche out when nobody ever reached the target", () => {
    const stats = computeTallyStats({
      players: PLAYERS,
      scores: SCORES,
      target: 100,
    });

    expect(stats.fatalStage).toBeNull();
  });
});

describe("buildStageTotalsSeries", () => {
  it("draws nothing for a game with no manche", () => {
    expect(buildStageTotalsSeries(PLAYERS, [])).toEqual({
      series: [],
      maxScore: 0,
    });
  });

  it("plots each player's running total, one point per manche", () => {
    const { series, maxScore } = buildStageTotalsSeries(PLAYERS, SCORES);

    expect(maxScore).toBe(16);
    expect(series[0]).toEqual({
      playerId: A,
      points: [
        { x: 0, score: 0 },
        { x: 1 / 3, score: 0 },
        { x: 2 / 3, score: 4 },
        { x: 1, score: 4 },
      ],
    });
  });

  it("holds a player's total across a manche they have no line for", () => {
    const { series } = buildStageTotalsSeries(
      [{ playerId: A, name: "Alice" }],
      [
        { stage: 1, playerId: A, points: 3 },
        { stage: 2, playerId: B, points: 2 },
      ],
    );

    expect(series[0].points.map(p => p.score)).toEqual([0, 3, 3]);
  });

  it("keeps a floor of 1 so a table still at zero has an axis", () => {
    expect(buildStageTotalsSeries(PLAYERS, stage(1, [0, 0, 0])).maxScore).toBe(
      1,
    );
  });
});
