import { describe, expect, it } from "vitest";

import type { FieldSpec, PlayerId } from "@/lib/domain";

import {
  leaderByScore,
  reachedThreshold,
  winnerDirection,
  winThresholdFrom,
} from "./scoring";

const p = (n: string) => n as PlayerId;

describe("winnerDirection", () => {
  it("maps each win condition to a direction (threshold races to the top)", () => {
    expect(winnerDirection({ type: "highest" })).toBe("highest");
    expect(winnerDirection({ type: "lowest" })).toBe("lowest");
    expect(winnerDirection({ type: "threshold", field: "pointsToWin" })).toBe(
      "highest",
    );
  });
});

describe("leaderByScore", () => {
  const entries = [
    { playerId: p("a"), score: 92 },
    { playerId: p("b"), score: 104 },
    { playerId: p("c"), score: 87 },
  ];

  it("picks the highest / lowest by direction", () => {
    expect(leaderByScore(entries, "highest")).toBe("b");
    expect(leaderByScore(entries, "lowest")).toBe("c");
  });

  it("keeps the first among tied leaders", () => {
    const tied = [
      { playerId: p("a"), score: 50 },
      { playerId: p("b"), score: 50 },
    ];

    expect(leaderByScore(tied, "highest")).toBe("a");
  });

  it("ignores players without a score, null when nobody scored", () => {
    expect(
      leaderByScore(
        [
          { playerId: p("a"), score: null },
          { playerId: p("b"), score: 10 },
        ],
        "highest",
      ),
    ).toBe("b");
    expect(
      leaderByScore([{ playerId: p("a"), score: null }], "highest"),
    ).toBeNull();
  });
});

describe("reachedThreshold", () => {
  it("returns the first player at or above the target", () => {
    const entries = [
      { playerId: p("a"), score: 8 },
      { playerId: p("b"), score: 10 },
    ];

    expect(reachedThreshold(entries, 10)).toBe("b");
  });

  it("returns null when nobody has reached it (unscored ignored)", () => {
    const entries = [
      { playerId: p("a"), score: null },
      { playerId: p("b"), score: 9 },
    ];

    expect(reachedThreshold(entries, 10)).toBeNull();
  });
});

describe("winThresholdFrom", () => {
  const fields: FieldSpec[] = [
    {
      key: "pointsToWin",
      label: "Points",
      type: "integer",
      min: 3,
      max: 20,
      default: 10,
    },
  ];
  const threshold = { type: "threshold", field: "pointsToWin" } as const;

  it("prefers the config value", () => {
    expect(winThresholdFrom(threshold, { pointsToWin: 12 }, fields)).toBe(12);
  });

  it("falls back to the template default when the config lacks it", () => {
    expect(winThresholdFrom(threshold, null, fields)).toBe(10);
    expect(winThresholdFrom(threshold, { other: 1 }, fields)).toBe(10);
  });

  it("is null for a non-threshold condition", () => {
    expect(
      winThresholdFrom({ type: "highest" }, { pointsToWin: 12 }, fields),
    ).toBeNull();
  });

  it("is null when neither config nor template supplies a number", () => {
    expect(winThresholdFrom(threshold, null, [])).toBeNull();
  });
});
