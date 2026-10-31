import { describe, expect, it } from "vitest";

import type { GameStatsRecord, PlayerId, StageBet } from "@/lib/domain";

import { betHighlights, betProfile, betStats } from "./bet-stats";

const LUZ: StageBet = {
  win: 10,
  hedgedWin: 5,
  missPerTrick: 5,
  tricks: 10,
  hedgeLabel: "Jeton Sécurité",
};
const A = "a" as PlayerId;
const B = "b" as PlayerId;

function party(
  lines: Array<[PlayerId, number, number, boolean]>,
  extra: Partial<GameStatsRecord> = {},
): GameStatsRecord {
  return {
    players: [
      { playerId: A, name: "Ann" },
      { playerId: B, name: "Bob" },
    ],
    stageScores: lines.map(([playerId, stage, points, hedged]) => ({
      stage,
      playerId,
      points,
      hedged,
    })),
    ...extra,
  } as GameStatsRecord;
}

describe("betProfile", () => {
  it("says cautious or bold, and whether it pays", () => {
    expect(betProfile(0.75, 0.5)).toBe("Prudent et efficace");
    expect(betProfile(0.75, 0.25)).toBe("Prudent mais malchanceux");
    expect(betProfile(0.25, 0.75)).toBe("Audacieux et efficace");
    expect(betProfile(0, 0)).toBe("Audacieux mais malchanceux");
  });
});

describe("betStats", () => {
  // Ann: hedged and won on 1, missed by 2 on 2. Bob: won unhedged on 1,
  // hedged and missed by 1 on 2.
  const stats = betStats(
    [
      party([
        [A, 1, 5, true],
        [B, 1, 10, false],
        [A, 2, -10, false],
        [B, 2, -5, true],
      ]),
      party([], { stageScores: undefined }),
    ],
    LUZ,
    2,
  );

  it("reads each player's way of betting", () => {
    expect(stats.players).toEqual([
      {
        playerId: A,
        name: "Ann",
        bets: 2,
        won: 1,
        successRate: 0.5,
        hedges: 1,
        hedgeRate: 0.5,
        hedgeByStage: [1, 0],
        avgMissGap: 2,
        profile: "Prudent et efficace",
      },
      {
        playerId: B,
        name: "Bob",
        bets: 2,
        won: 1,
        successRate: 0.5,
        hedges: 1,
        hedgeRate: 0.5,
        hedgeByStage: [0, 1],
        avgMissGap: 1,
        profile: "Prudent et efficace",
      },
    ]);
  });

  it("reads every manche across the table", () => {
    expect(stats.byStage).toEqual([
      { stage: 1, bets: 2, successRate: 1, hedgeRate: 0.5 },
      { stage: 2, bets: 2, successRate: 0, hedgeRate: 0.5 },
    ]);
  });

  it("weighs the token against going without", () => {
    expect(stats.hedged).toEqual({
      bets: 2,
      won: 1,
      successRate: 0.5,
      avgPoints: 0,
    });
    expect(stats.unhedged).toEqual({
      bets: 2,
      won: 1,
      successRate: 0.5,
      avgPoints: 0,
    });
  });

  it("leaves blank what nobody played, and a stranger's line out", () => {
    const sparse = betStats(
      [
        party([
          [A, 1, 10, false],
          ["x" as PlayerId, 1, 10, false],
        ]),
      ],
      LUZ,
      2,
    );

    expect(sparse.players).toHaveLength(1);
    expect(sparse.players[0].hedgeByStage).toEqual([0, null]);
    expect(sparse.players[0].avgMissGap).toBeNull();
    expect(sparse.byStage[1]).toEqual({
      stage: 2,
      bets: 0,
      successRate: null,
      hedgeRate: null,
    });
    expect(sparse.hedged).toEqual({
      bets: 0,
      won: 0,
      successRate: null,
      avgPoints: null,
    });
  });

  it("ranks the most reliable first, then by name", () => {
    const ranked = betStats(
      [
        party([
          [A, 1, -5, false],
          [B, 1, 10, false],
        ]),
      ],
      LUZ,
      1,
    );

    expect(ranked.players.map(p => p.name)).toEqual(["Bob", "Ann"]);
  });
});

describe("betHighlights", () => {
  it("finds the biggest drop and who won every bet", () => {
    expect(
      betHighlights(
        party([
          [A, 1, 10, false],
          [A, 2, 10, true],
          [B, 1, -15, false],
          [B, 2, -5, false],
        ]),
        2,
      ),
    ).toEqual({
      drop: { name: "Bob", stage: 1, points: -15 },
      perfect: ["Ann"],
    });
  });

  it("finds no drop when no bet was missed", () => {
    expect(betHighlights(party([[A, 1, 10, false]]), 4)).toEqual({
      drop: null,
      perfect: [],
    });
    expect(
      betHighlights({ ...party([]), stageScores: undefined }, 1).perfect,
    ).toEqual([]);
  });
});
