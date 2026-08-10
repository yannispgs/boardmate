import { describe, expect, it } from "vitest";

import type {
  BoardgameId,
  GameStatsRecord,
  PlayerId,
  ScoreSheetItem,
} from "@/lib/domain";
import {
  breakdownUsage,
  categoryGroups,
  categorySlices,
  detailSubsections,
  groupSlices,
  hasUsableBreakdown,
  usableBreakdowns,
} from "./category-stats";

// A Cascadia-like sheet: two subsections + a standalone line.
const sheet: ScoreSheetItem[] = [
  {
    label: "Animaux",
    showDetail: true,
    categories: [
      { key: "ours", label: "Ours", colors: ["#5F4A4A"] },
      { key: "buse", label: "Buse", colors: ["#3BD1FC"] },
    ],
  },
  {
    label: "Biomes",
    categories: [
      { key: "foret", label: "Forêt" },
      { key: "prairie", label: "Prairie" },
    ],
  },
  { key: "pommesDePin", label: "Pommes de pin" },
];

// A Wingspan-like sheet: plain lines, no section, no colours of its own.
const flat: ScoreSheetItem[] = [
  { key: "oiseaux", label: "Oiseaux" },
  { key: "oeufs", label: "Œufs" },
  { key: "nectar", label: "Nectar" },
];

const ALICE = "p-alice" as PlayerId;
const BOB = "p-bob" as PlayerId;

const CASCADIA = "b" as BoardgameId;
const OTHER = "b-other" as BoardgameId;

function rec(
  players: Array<{ id: PlayerId; breakdown: Record<string, number> | null }>,
  boardgameId: BoardgameId = CASCADIA,
): GameStatsRecord {
  return {
    gameId: "g" as GameStatsRecord["gameId"],
    boardgameId,
    boardgameName: "Cascadia",
    dice: null,
    endedAt: "2026-07-01T00:00:00Z",
    players: players.map((p, i) => ({
      playerId: p.id,
      name: `P${i}`,
      seatOrder: i,
      isWinner: i === 0,
      score: null,
      scoreBreakdown: p.breakdown,
    })),
    turns: [],
    diceRolls: [],
  };
}

const full = { ours: 5, buse: 3, foret: 4, prairie: 2, pommesDePin: 1 };

describe("categoryGroups", () => {
  it("makes one group per sheet entry, in sheet order", () => {
    const groups = categoryGroups(sheet);

    expect(groups.map(g => g.label)).toEqual([
      "Animaux",
      "Biomes",
      "Pommes de pin",
    ]);
    expect(groups[0].keys).toEqual(["ours", "buse"]);
    expect(groups[2].keys).toEqual(["pommesDePin"]);
  });

  it("gives a sheet without any section one group per line", () => {
    const groups = categoryGroups(flat);

    expect(groups.map(g => g.label)).toEqual(["Oiseaux", "Œufs", "Nectar"]);
    expect(groups.map(g => g.keys)).toEqual([
      ["oiseaux"],
      ["oeufs"],
      ["nectar"],
    ]);
  });

  it("tells every group apart by colour, standalone lines included", () => {
    expect(new Set(categoryGroups(sheet).map(g => g.color)).size).toBe(3);
    expect(new Set(categoryGroups(flat).map(g => g.color)).size).toBe(3);
  });

  it("still has a colour for a sheet longer than the palette", () => {
    const long: ScoreSheetItem[] = Array.from({ length: 11 }, (_, i) => ({
      key: `k${i}`,
      label: `L${i}`,
    }));

    expect(categoryGroups(long).every(g => g.color !== undefined)).toBe(true);
  });
});

describe("detailSubsections", () => {
  it("keeps only the sections the game asked to detail", () => {
    expect(detailSubsections(sheet).map(s => s.label)).toEqual(["Animaux"]);
  });

  it("details every section that asks for it, in sheet order", () => {
    const both: ScoreSheetItem[] = [
      { label: "Biomes", showDetail: true, categories: [] },
      { label: "Animaux", showDetail: true, categories: [] },
    ];

    expect(detailSubsections(both).map(s => s.label)).toEqual([
      "Biomes",
      "Animaux",
    ]);
  });

  it("details nothing on a sheet with no section at all", () => {
    expect(detailSubsections(flat)).toEqual([]);
  });

  it("leaves a section alone until it is flagged", () => {
    expect(detailSubsections([sheet[1]])).toEqual([]);
  });
});

describe("hasUsableBreakdown", () => {
  it("takes a breakdown that carries any category of the sheet", () => {
    expect(hasUsableBreakdown(sheet, full)).toBe(true);
    expect(hasUsableBreakdown(sheet, { ours: 5 })).toBe(true);
  });

  it("rejects nothing at all, or points about another sheet entirely", () => {
    expect(hasUsableBreakdown(sheet, null)).toBe(false);
    expect(hasUsableBreakdown(sheet, {})).toBe(false);
    expect(hasUsableBreakdown(sheet, { oiseaux: 12 })).toBe(false);
  });

  it("keeps counting a game after a line is added to the sheet", () => {
    // The whole point: no past game can hold a key invented today, and that
    // must not wipe it from the charts.
    const grown: ScoreSheetItem[] = [...sheet, { key: "neuf", label: "Neuf" }];

    expect(hasUsableBreakdown(grown, full)).toBe(true);
  });
});

describe("usableBreakdowns", () => {
  const partial = { ours: 1 };
  const records = [
    rec([
      { id: ALICE, breakdown: full },
      { id: BOB, breakdown: partial },
    ]),
    rec([{ id: ALICE, breakdown: null }]), // nothing recorded → skipped
  ];

  it("keeps every breakdown that says something, all players by default", () => {
    expect(usableBreakdowns(records, sheet)).toEqual([full, partial]);
  });

  it("filters to one player when asked", () => {
    expect(usableBreakdowns(records, sheet, BOB)).toEqual([partial]);
    expect(usableBreakdowns(records, sheet, ALICE)).toEqual([full]);
  });
});

describe("breakdownUsage", () => {
  it("counts the games each category key was scored on", () => {
    const records = [
      rec([{ id: ALICE, breakdown: { ours: 5, buse: 3 } }]),
      rec([{ id: ALICE, breakdown: { ours: 2 } }]),
    ];

    expect(breakdownUsage(records, CASCADIA)).toEqual({ ours: 2, buse: 1 });
  });

  it("counts a game once however many players scored under the key", () => {
    const records = [
      rec([
        { id: ALICE, breakdown: { ours: 5 } },
        { id: BOB, breakdown: { ours: 7 } },
      ]),
    ];

    expect(breakdownUsage(records, CASCADIA)).toEqual({ ours: 1 });
  });

  it("counts a key even when the points scored under it are 0", () => {
    // A recorded 0 is still history: dropping the line would bury it.
    expect(
      breakdownUsage([rec([{ id: ALICE, breakdown: { ours: 0 } }])], CASCADIA),
    ).toEqual({
      ours: 1,
    });
  });

  it("ignores the games of every other boardgame", () => {
    const records = [
      rec([{ id: ALICE, breakdown: { ours: 5 } }]),
      rec([{ id: ALICE, breakdown: { oiseaux: 9 } }], OTHER),
    ];

    expect(breakdownUsage(records, CASCADIA)).toEqual({ ours: 1 });
  });

  it("is empty when nothing was ever recorded", () => {
    expect(
      breakdownUsage([rec([{ id: ALICE, breakdown: null }])], CASCADIA),
    ).toEqual({});
    expect(breakdownUsage([], CASCADIA)).toEqual({});
  });
});

describe("groupSlices", () => {
  it("means the group totals over the breakdowns", () => {
    const b2 = { ours: 3, buse: 1, foret: 0, prairie: 4, pommesDePin: 5 };
    const slices = groupSlices(sheet, [full, b2]);

    // Animaux: (5+3)/1 games… mean of (8) and (4) = 6; Biomes: (6, 4) = 5;
    // Pommes de pin: (1, 5) = 3.
    expect(slices.map(s => [s.label, s.value])).toEqual([
      ["Animaux", 6],
      ["Biomes", 5],
      ["Pommes de pin", 3],
    ]);
  });

  it("is all zeros with no breakdowns", () => {
    expect(groupSlices(sheet, []).map(s => s.value)).toEqual([0, 0, 0]);
  });

  it("treats a category absent from a breakdown as 0", () => {
    // Only `ours` present → Animaux 5, the other two 0 (missing → 0).
    expect(groupSlices(sheet, [{ ours: 5 }]).map(s => s.value)).toEqual([
      5, 0, 0,
    ]);
  });
});

describe("categorySlices", () => {
  it("means each category and carries its colour", () => {
    const animals = detailSubsections(sheet)[0].categories;
    const slices = categorySlices(animals, [full, { ours: 1, buse: 7 }]);

    expect(slices).toEqual([
      { label: "Ours", value: 3, color: "#5F4A4A" },
      { label: "Buse", value: 5, color: "#3BD1FC" },
    ]);
  });

  it("falls back to the palette when a category names no colour", () => {
    const slices = categorySlices(
      [
        { key: "foret", label: "Forêt" },
        { key: "prairie", label: "Prairie" },
      ],
      [full],
    );

    expect(slices[0].color).not.toBe(slices[1].color);
    expect(slices.map(s => s.color)).not.toContain("#9ca3af");
  });

  it("treats an absent category as 0 points", () => {
    const slices = categorySlices(
      [{ key: "ours", label: "Ours" }],
      [{ buse: 7 }], // ours missing → 0
    );

    expect(slices[0].value).toBe(0);
  });
});
