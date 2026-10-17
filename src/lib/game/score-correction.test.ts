import { describe, expect, it } from "vitest";

import type {
  Boardgame,
  PlayerId,
  ScoringSpec,
  TieBreakRecord,
} from "@/lib/domain";
import {
  correctedWinners,
  correctionSeed,
  keptTieBreak,
  scoresCorrectable,
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
  it("corrects a game typed as totals, piles or a category grid", () => {
    expect(scoresCorrectable(game(TOTAL))).toBe(true);
    expect(scoresCorrectable(game(PAIRS))).toBe(true);
    expect(scoresCorrectable(game(CATEGORIES))).toBe(true);
    expect(scoresCorrectable(game(CATEGORIES, "pass"))).toBe(true);
  });

  it("leaves out a game with no score, and one added up manche by manche", () => {
    expect(scoresCorrectable(game(null))).toBe(false);
    expect(scoresCorrectable(game(TOTAL, "manual"))).toBe(false);
  });

  it("leaves out a sheet with a line counted during play", () => {
    const wingspan = {
      ...CATEGORIES,
      sheet: [
        { key: "oiseaux", label: "Oiseaux" },
        {
          key: "manches",
          label: "Objectifs de manche",
          derived: "stageGoals",
        },
      ],
    } as ScoringSpec;

    expect(scoresCorrectable(game(wingspan, "schedule"))).toBe(false);
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
