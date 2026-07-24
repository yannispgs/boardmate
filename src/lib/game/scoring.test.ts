import { describe, expect, it } from "vitest";

import type {
  FieldSpec,
  PlayerId,
  ScoreSheetItem,
  ScoringSpec,
} from "@/lib/domain";

import {
  categoryTotal,
  clampScore,
  initialScoreFor,
  isSubsection,
  leaderByScore,
  rankBonusFor,
  rankByTotal,
  rankFinalScores,
  reachedThreshold,
  scoreCategories,
  scoreFloor,
  sheetCategories,
  winnerDirection,
  winThresholdFrom,
} from "./scoring";

const p = (n: string) => n as PlayerId;

const scoring = (over: Partial<ScoringSpec>): ScoringSpec => ({
  timing: "live",
  entry: "total",
  winCondition: { type: "highest" },
  ...over,
});

describe("initialScoreFor", () => {
  it("seeds live games at startScore (default 0)", () => {
    expect(initialScoreFor(scoring({ startScore: 2 }))).toBe(2);
    expect(initialScoreFor(scoring({}))).toBe(0);
  });

  it("returns null for final scoring or no scoring", () => {
    expect(initialScoreFor(scoring({ timing: "final", startScore: 2 }))).toBe(
      null,
    );
    expect(initialScoreFor(null)).toBe(null);
  });
});

describe("scoreFloor", () => {
  it("is minScore for positive-only games (default 0)", () => {
    expect(scoreFloor(scoring({ minScore: 2 }))).toBe(2);
    expect(scoreFloor(scoring({}))).toBe(0);
  });

  it("is null when negatives are allowed or there is no scoring", () => {
    expect(scoreFloor(scoring({ allowNegative: true, minScore: 2 }))).toBe(
      null,
    );
    expect(scoreFloor(null)).toBe(null);
  });
});

describe("clampScore", () => {
  it("rounds and clamps to the floor", () => {
    expect(clampScore(1, scoring({ minScore: 2 }))).toBe(2);
    expect(clampScore(5.4, scoring({ minScore: 2 }))).toBe(5);
    expect(clampScore(-3, scoring({}))).toBe(0);
  });

  it("leaves values through when negatives are allowed", () => {
    expect(clampScore(-3, scoring({ allowNegative: true }))).toBe(-3);
  });
});

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

describe("rankFinalScores", () => {
  it("ranks highest first when the game wins on the highest score", () => {
    const ranked = rankFinalScores(
      [
        { playerId: p("a"), score: 20 },
        { playerId: p("b"), score: 30 },
        { playerId: p("c"), score: 20 },
        { playerId: p("d"), score: 10 },
      ],
      "highest",
    );

    expect(ranked.map(r => [r.playerId, r.total, r.rank])).toEqual([
      ["b", 30, 1],
      ["a", 20, 2], // input order breaks the tie
      ["c", 20, 2],
      ["d", 10, 4],
    ]);
  });

  it("ranks lowest first when the game wins on the lowest score", () => {
    const ranked = rankFinalScores(
      [
        { playerId: p("a"), score: 20 },
        { playerId: p("b"), score: 5 },
        { playerId: p("c"), score: 12 },
      ],
      "lowest",
    );

    expect(ranked.map(r => [r.playerId, r.rank])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });

  it("returns an empty ranking for no players", () => {
    expect(rankFinalScores([], "highest")).toEqual([]);
  });
});

describe("rankBonusFor", () => {
  const awards = [3, 1]; // 1st: 3, 2nd: 1

  it("awards the leaders by placement", () => {
    // one clear 1st (5), one clear 2nd (3), one 3rd (1), one absent (0)
    expect(rankBonusFor([5, 3, 1, 0], awards)).toEqual([3, 1, 0, 0]);
  });

  it("splits a tie for 1st across the top two places, floored", () => {
    // (3 + 1) / 2 = 2 each; the rest get nothing
    expect(rankBonusFor([5, 5, 2], awards)).toEqual([2, 2, 0]);
  });

  it("splits a tie for 2nd, flooring to zero while 1st keeps the win", () => {
    // leader 3; the pair share ⌊(1 + 0) / 2⌋ = 0
    expect(rankBonusFor([5, 3, 3], awards)).toEqual([3, 0, 0]);
  });

  it("ignores players with nothing there (value ≤ 0), even when all are zero", () => {
    expect(rankBonusFor([0, 0, 0], awards)).toEqual([0, 0, 0]);
    expect(rankBonusFor([4, 0], awards)).toEqual([3, 0]);
  });
});

describe("scoreCategories", () => {
  const sheet: ScoreSheetItem[] = [
    {
      label: "Animaux",
      categories: [{ key: "ours", label: "Ours" }],
    },
    {
      label: "Biomes",
      rankBonus: [3, 1],
      categories: [
        { key: "foret", label: "Forêt" },
        { key: "riviere", label: "Rivière" },
      ],
    },
    { label: "Pommes de pin", key: "pommesDePin" },
  ];

  it("adds each ranked line's placement bonus on top of the entered points", () => {
    const scores = scoreCategories(
      sheet,
      {
        a: { ours: 4, foret: 5, riviere: 2, pommesDePin: 3 },
        b: { ours: 1, foret: 2, riviere: 6, pommesDePin: 1 },
      },
      [p("a"), p("b")],
    );

    // a raw = 4+5+2+3 = 14; wins forêt (+3), loses rivière (+1) → bonus 4 → 18
    expect(scores.a).toEqual({ raw: 14, bonus: 4, total: 18 });
    // b raw = 1+2+6+1 = 10; loses forêt (+1), wins rivière (+3) → bonus 4 → 14
    expect(scores.b).toEqual({ raw: 10, bonus: 4, total: 14 });
  });

  it("leaves non-ranked subsections without any bonus", () => {
    const noBonusSheet: ScoreSheetItem[] = [
      { label: "Animaux", categories: [{ key: "ours", label: "Ours" }] },
    ];
    const scores = scoreCategories(noBonusSheet, { a: { ours: 7 } }, [p("a")]);

    expect(scores.a).toEqual({ raw: 7, bonus: 0, total: 7 });
  });

  it("treats a player absent from the values as all zeros", () => {
    // "b" has no entry at all, and "a" only filled forêt.
    const scores = scoreCategories(sheet, { a: { foret: 5 } }, [
      p("a"),
      p("b"),
    ]);

    // forêt: a (5) is alone eligible → +3; rivière: nobody → no bonus.
    expect(scores.a).toEqual({ raw: 5, bonus: 3, total: 8 });
    expect(scores.b).toEqual({ raw: 0, bonus: 0, total: 0 });
  });
});
