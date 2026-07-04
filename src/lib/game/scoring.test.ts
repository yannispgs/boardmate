import { describe, expect, it } from "vitest";

import type { FieldSpec, PlayerId, ScoreSheetItem } from "@/lib/domain";

import {
  categoryTotal,
  isSubsection,
  leaderByScore,
  rankByTotal,
  reachedThreshold,
  sheetCategories,
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

describe("category scoresheet helpers", () => {
  const sheet: ScoreSheetItem[] = [
    {
      label: "Animaux",
      categories: [
        { key: "ours", label: "Ours" },
        { key: "buse", label: "Buse" },
      ],
    },
    { label: "Pommes de pin", key: "pommesDePin" },
  ];

  it("distinguishes subsections from standalone lines", () => {
    expect(isSubsection(sheet[0])).toBe(true);
    expect(isSubsection(sheet[1])).toBe(false);
  });

  it("flattens every scored line across subsections and standalones", () => {
    expect(sheetCategories(sheet).map(c => c.key)).toEqual([
      "ours",
      "buse",
      "pommesDePin",
    ]);
  });

  it("sums a player's points over the sheet, missing categories as 0", () => {
    expect(categoryTotal(sheet, { ours: 5, pommesDePin: 3 })).toBe(8); // buse absent → 0
    expect(categoryTotal(sheet, {})).toBe(0);
  });
});

describe("rankByTotal", () => {
  it("ranks highest first, ties sharing a rank (1, 2, 2, 4)", () => {
    const ranked = rankByTotal([
      { playerId: p("a"), total: 20 },
      { playerId: p("b"), total: 30 },
      { playerId: p("c"), total: 20 },
      { playerId: p("d"), total: 10 },
    ]);

    expect(ranked.map(r => [r.playerId, r.rank])).toEqual([
      ["b", 1],
      ["a", 2], // "a" before "c": input order breaks the tie
      ["c", 2],
      ["d", 4],
    ]);
  });

  it("returns an empty ranking for no players", () => {
    expect(rankByTotal([])).toEqual([]);
  });
});
