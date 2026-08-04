import { describe, expect, it } from "vitest";

import type { GameStatsRecord, PlayerId, ScoreSheetItem } from "@/lib/domain";
import {
  categoryGroups,
  categorySlices,
  completeBreakdowns,
  detailSubsections,
  groupSlices,
  hasCompleteBreakdown,
} from "./category-stats";

// A Cascadia-like sheet: two subsections + a standalone (→ "Divers").
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

function rec(
  players: Array<{ id: PlayerId; breakdown: Record<string, number> | null }>,
): GameStatsRecord {
  return {
    gameId: "g" as GameStatsRecord["gameId"],
    boardgameId: "b" as GameStatsRecord["boardgameId"],
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
  it("makes one group per subsection and bundles standalones into Divers", () => {
    const groups = categoryGroups(sheet);

    expect(groups.map(g => g.label)).toEqual(["Animaux", "Biomes", "Divers"]);
    expect(groups[0].keys).toEqual(["ours", "buse"]);
    expect(groups[2].keys).toEqual(["pommesDePin"]);
    // Subsections get distinct hues; Divers is grey.
    expect(groups[0].color).not.toBe(groups[1].color);
    expect(groups[2].color).toBe("#9ca3af");
  });

  it("omits Divers when there is no standalone line", () => {
    expect(categoryGroups([sheet[0]]).map(g => g.label)).toEqual(["Animaux"]);
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

  it("tells those lines apart by colour instead of drowning them in Divers", () => {
    const colors = categoryGroups(flat).map(g => g.color);

    expect(new Set(colors).size).toBe(3);
    expect(colors).not.toContain("#9ca3af");
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

describe("hasCompleteBreakdown", () => {
  it("requires a value for every sheet category", () => {
    expect(hasCompleteBreakdown(sheet, null)).toBe(false);
    expect(hasCompleteBreakdown(sheet, { ours: 5 })).toBe(false);
    expect(hasCompleteBreakdown(sheet, full)).toBe(true);
  });
});

describe("completeBreakdowns", () => {
  const records = [
    rec([
      { id: ALICE, breakdown: full },
      { id: BOB, breakdown: { ours: 1 } }, // incomplete → skipped
    ]),
    rec([{ id: ALICE, breakdown: null }]), // no breakdown → skipped
  ];

  it("keeps only complete breakdowns, all players by default", () => {
    expect(completeBreakdowns(records, sheet)).toEqual([full]);
  });

  it("filters to one player when asked", () => {
    expect(completeBreakdowns(records, sheet, BOB)).toEqual([]);
    expect(completeBreakdowns(records, sheet, ALICE)).toEqual([full]);
  });
});

describe("groupSlices", () => {
  it("means the group totals over the breakdowns", () => {
    const b2 = { ours: 3, buse: 1, foret: 0, prairie: 4, pommesDePin: 5 };
    const slices = groupSlices(sheet, [full, b2]);

    // Animaux: (5+3)/1 games… mean of (8) and (4) = 6; Biomes: (6, 4) = 5;
    // Divers: (1, 5) = 3.
    expect(slices.map(s => [s.label, s.value])).toEqual([
      ["Animaux", 6],
      ["Biomes", 5],
      ["Divers", 3],
    ]);
  });

  it("is all zeros with no breakdowns", () => {
    expect(groupSlices(sheet, []).map(s => s.value)).toEqual([0, 0, 0]);
  });

  it("treats a category absent from a breakdown as 0", () => {
    // Only `ours` present → Animaux 5, Biomes / Divers 0 (missing → 0).
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
