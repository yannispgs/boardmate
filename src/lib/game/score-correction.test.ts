import { describe, expect, it } from "vitest";

import type {
  Boardgame,
  PlayerId,
  ScoringSpec,
  StageScore,
  TieBreakRecord,
} from "@/lib/domain";
import {
  changedStages,
  correctedWinners,
  correctionSeed,
  correctsByStage,
  keptTieBreak,
  recordedStages,
  scoresCorrectable,
  stageDerivedKeys,
  stageTotals,
  withStageEntry,
} from "./score-correction";

const id = (value: string) => value as PlayerId;

const TOTAL = {
  timing: "final",
  entry: "total",
  winCondition: { type: "highest" },
} as ScoringSpec;
const PAIRS = { ...TOTAL, entry: "pairs" } as ScoringSpec;
const CATEGORIES = {
  ...TOTAL,
  entry: "categories",
  sheet: [
    { key: "arbres", label: "Arbres" },
    { key: "animaux", label: "Animaux" },
  ],
} as ScoringSpec;

function game(
  scoring: ScoringSpec | null,
  advance?: string,
): Pick<Boardgame, "scoring" | "stages"> {
  return {
    scoring,
    stages: advance === undefined ? null : { label: "Manche", advance },
  } as Pick<Boardgame, "scoring" | "stages">;
}

describe("scoresCorrectable", () => {
  it("corrects every scored game, manches included", () => {
    expect(scoresCorrectable(game(TOTAL))).toBe(true);
    expect(scoresCorrectable(game(PAIRS))).toBe(true);
    expect(scoresCorrectable(game(CATEGORIES, "schedule"))).toBe(true);
    expect(scoresCorrectable(game(TOTAL, "manual"))).toBe(true);
  });

  it("leaves out a game with no score", () => {
    expect(scoresCorrectable(game(null))).toBe(false);
  });
});

const ODIN_SCORES: StageScore[] = [
  { stage: 1, playerId: id("a"), points: 0 },
  { stage: 1, playerId: id("b"), points: 4 },
  { stage: 2, playerId: id("a"), points: 6 },
  { stage: 2, playerId: id("b"), points: 0 },
];

describe("correctsByStage", () => {
  it("reads a manche-by-manche game off its recorded manches", () => {
    expect(correctsByStage(game(TOTAL, "manual"), ODIN_SCORES)).toBe(true);
  });

  it("types the totals of one added without its manches, or of any other game", () => {
    expect(correctsByStage(game(TOTAL, "manual"), [])).toBe(false);
    expect(correctsByStage(game(TOTAL, "schedule"), ODIN_SCORES)).toBe(false);
    expect(correctsByStage(game(TOTAL), ODIN_SCORES)).toBe(false);
  });
});

describe("stageDerivedKeys", () => {
  const wingspan = {
    ...CATEGORIES,
    sheet: [
      { key: "oiseaux", label: "Oiseaux" },
      { key: "manches", label: "Objectifs de manche", derived: "stageGoals" },
    ],
  } as ScoringSpec;

  it("locks the line summed from recorded manches", () => {
    expect(stageDerivedKeys(wingspan, ODIN_SCORES)).toEqual(["manches"]);
  });

  it("leaves it typed when no manche was recorded, and has none elsewhere", () => {
    expect(stageDerivedKeys(wingspan, [])).toEqual([]);
    expect(stageDerivedKeys(CATEGORIES, ODIN_SCORES)).toEqual([]);
    expect(stageDerivedKeys(TOTAL, ODIN_SCORES)).toEqual([]);
  });
});

describe("recordedStages", () => {
  it("lists every manche, oldest first", () => {
    expect(recordedStages([...ODIN_SCORES].reverse())).toEqual([
      { stage: 1, points: { a: 0, b: 4 } },
      { stage: 2, points: { a: 6, b: 0 } },
    ]);
  });
});

describe("withStageEntry and changedStages", () => {
  it("replaces one manche and says only that one changed", () => {
    const after = withStageEntry(ODIN_SCORES, 2, [
      { playerId: id("a"), points: 3 },
      { playerId: id("b"), points: 0 },
    ]);

    expect(recordedStages(after)).toEqual([
      { stage: 1, points: { a: 0, b: 4 } },
      { stage: 2, points: { a: 3, b: 0 } },
    ]);
    expect(changedStages(ODIN_SCORES, after)).toEqual([2]);
  });

  it("lists several changed manches in order", () => {
    const after = withStageEntry(
      withStageEntry(ODIN_SCORES, 2, [
        { playerId: id("a"), points: 3 },
        { playerId: id("b"), points: 0 },
      ]),
      1,
      [
        { playerId: id("a"), points: 0 },
        { playerId: id("b"), points: 5 },
      ],
    );

    expect(changedStages(ODIN_SCORES, after)).toEqual([1, 2]);
  });

  it("keeps the phases ticked, and writes a manche whose tick alone changed", () => {
    const ticked = withStageEntry(ODIN_SCORES, 1, [
      { playerId: id("a"), points: 0, cleared: true },
      { playerId: id("b"), points: 4, cleared: false },
    ]);

    expect(ticked.filter(s => s.stage === 1)).toEqual([
      { stage: 1, playerId: id("a"), points: 0, cleared: true },
      { stage: 1, playerId: id("b"), points: 4, cleared: false },
    ]);
    expect(changedStages(ODIN_SCORES, ticked)).toEqual([1]);
  });

  it("keeps the safety token, and writes a donne whose token alone changed", () => {
    const hedged = withStageEntry(ODIN_SCORES, 1, [
      { playerId: id("a"), points: 0, hedged: true },
      { playerId: id("b"), points: 4 },
    ]);

    expect(hedged.filter(s => s.stage === 1)).toEqual([
      { stage: 1, playerId: id("a"), points: 0, hedged: true },
      { stage: 1, playerId: id("b"), points: 4 },
    ]);
    expect(changedStages(ODIN_SCORES, hedged)).toEqual([1]);
  });

  it("finds nothing to write when the manche is entered again unchanged", () => {
    const after = withStageEntry(ODIN_SCORES, 1, [
      { playerId: id("a"), points: 0 },
      { playerId: id("b"), points: 4 },
    ]);

    expect(changedStages(ODIN_SCORES, after)).toEqual([]);
  });
});

describe("stageTotals", () => {
  it("sums each player's manches, zero for one with none", () => {
    expect(stageTotals([id("a"), id("b"), id("c")], ODIN_SCORES)).toEqual({
      a: "6",
      b: "4",
      c: "0",
    });
  });
});

describe("correctionSeed", () => {
  it("types the totals back in", () => {
    const seed = correctionSeed(TOTAL, [
      { playerId: id("a"), score: 12, scoreBreakdown: null },
      { playerId: id("b"), score: null, scoreBreakdown: null },
    ]);

    expect(seed).toEqual({
      entryMode: "total",
      totals: { a: "12", b: "" },
      catRaw: {},
      piles: {},
    });
  });

  it("reopens the ring of piles when every seat kept its pair", () => {
    const seed = correctionSeed(PAIRS, [
      { playerId: id("a"), score: 6, scoreBreakdown: { left: 3, right: 2 } },
      { playerId: id("b"), score: 10, scoreBreakdown: { left: 2, right: 5 } },
      { playerId: id("c"), score: 15, scoreBreakdown: { left: 5, right: 3 } },
    ]);

    expect(seed.entryMode).toBe("detail");
    expect(seed.piles).toEqual({ pile0: 2, pile1: 5, pile2: 3 });
  });

  it("reopens the category grid when every player kept it", () => {
    const seed = correctionSeed(CATEGORIES, [
      {
        playerId: id("a"),
        score: 9,
        scoreBreakdown: { arbres: 4, animaux: 5 },
      },
    ]);

    expect(seed.entryMode).toBe("detail");
    expect(seed.catRaw).toEqual({ a: { arbres: "4", animaux: "5" } });
  });

  it("falls back to the totals when a player's detail is missing", () => {
    const seats = [
      { playerId: id("a"), score: 9, scoreBreakdown: { arbres: 9 } },
      { playerId: id("b"), score: 7, scoreBreakdown: null },
    ];

    expect(correctionSeed(CATEGORIES, seats).entryMode).toBe("total");
    expect(correctionSeed(PAIRS, seats).entryMode).toBe("total");
  });
});

describe("keptTieBreak", () => {
  const record: TieBreakRecord = {
    tied: [id("a"), id("b")],
    steps: [],
    shared: false,
  };
  const before = { a: 10, b: 10, c: 4 };

  it("keeps the record while the level leaders and the crown are untouched", () => {
    expect(
      keptTieBreak(
        record,
        TOTAL,
        before,
        { a: 10, b: 10, c: 7 },
        [id("a")],
        [id("a")],
      ),
    ).toBe(record);
  });

  it("drops it once a level leader's score moves", () => {
    expect(
      keptTieBreak(
        record,
        TOTAL,
        before,
        { a: 11, b: 10, c: 4 },
        [id("a")],
        [id("a")],
      ),
    ).toBeNull();
  });

  it("drops it once somebody else joins the lead", () => {
    expect(
      keptTieBreak(
        record,
        TOTAL,
        before,
        { a: 10, b: 10, c: 10 },
        [id("a")],
        [id("a")],
      ),
    ).toBeNull();
  });

  it("drops it once the crown changes hands", () => {
    expect(
      keptTieBreak(record, TOTAL, before, before, [id("a")], [id("b")]),
    ).toBeNull();
  });

  it("reads the lead at the low end on a game won low", () => {
    const low = { ...TOTAL, winCondition: { type: "lowest" } } as ScoringSpec;
    const lowBefore = { a: 2, b: 2, c: 9 };

    expect(
      keptTieBreak(record, low, lowBefore, lowBefore, [id("a")], [id("a")]),
    ).toBe(record);
  });

  it("has nothing to keep when nothing was settled", () => {
    expect(keptTieBreak(null, TOTAL, before, before, [], [])).toBeNull();
  });
});

describe("correctedWinners", () => {
  it("crowns the lone leader the corrected sheet names", () => {
    expect(correctedWinners(false, [id("b")], [id("a")], [id("b")])).toEqual([
      id("b"),
    ]);
  });

  it("keeps the old crown while it is still among the level leaders", () => {
    expect(correctedWinners(true, [], [id("a")], [id("a"), id("c")])).toEqual([
      id("a"),
    ]);
  });

  it("asks again once the old winner has left the lead", () => {
    expect(correctedWinners(true, [], [id("a")], [id("b"), id("c")])).toEqual(
      [],
    );
  });
});
