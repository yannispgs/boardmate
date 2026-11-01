import { describe, expect, it } from "vitest";

import type { ScoreGrid, ScoreSheetItem } from "@/lib/domain";

import {
  cellCount,
  gridLines,
  gridTotal,
  seedCells,
  usableGrid,
  zoneOffset,
  zoneSize,
} from "./score-grid";

// Symbiose's mare: left column, two centre columns, right column.
const MARE: ScoreGrid = {
  rows: 2,
  zones: [
    { category: "left", columns: 1, framed: true },
    { category: "centre", columns: 2 },
    { category: "right", columns: 1, framed: true },
  ],
};
const SHEET: ScoreSheetItem[] = [
  { key: "left", label: "Colonne gauche" },
  { key: "centre", label: "Colonnes centrales" },
  { key: "right", label: "Colonne droite" },
];

describe("zoneSize, zoneOffset and cellCount", () => {
  it("lays the cells out zone after zone", () => {
    expect([0, 1, 2].map(z => zoneSize(MARE, z))).toEqual([2, 4, 2]);
    expect([0, 1, 2].map(z => zoneOffset(MARE, z))).toEqual([0, 2, 6]);
    expect(cellCount(MARE)).toBe(8);
    expect(zoneSize(MARE, 9)).toBe(0);
  });
});

describe("usableGrid", () => {
  it("keeps a grid that covers the sheet line for line", () => {
    expect(usableGrid(SHEET, MARE)).toBe(MARE);
  });

  it("drops a grid the sheet has moved away from", () => {
    expect(usableGrid(SHEET, undefined)).toBeNull();
    expect(usableGrid(SHEET, { rows: 0, zones: MARE.zones })).toBeNull();
    expect(usableGrid(SHEET, { rows: 2, zones: [] })).toBeNull();
    expect(usableGrid(SHEET.slice(0, 2), MARE)).toBeNull();
    expect(
      usableGrid([...SHEET, { key: "bonus", label: "Bonus" }], MARE),
    ).toBeNull();
    expect(
      usableGrid(SHEET, {
        rows: 2,
        zones: MARE.zones.map(z => ({ ...z, columns: 0 })),
      }),
    ).toBeNull();
  });
});

describe("gridLines and gridTotal", () => {
  it("adds each zone up once all its cards are counted", () => {
    const cells = ["3", "4", "1", "2", "", "5", "6", "0"];

    expect(gridLines(MARE, cells)).toEqual({
      left: "7",
      centre: "",
      right: "6",
    });
    expect(gridTotal(cells)).toBe(21);
  });

  it("adds two zones of one line together", () => {
    const split: ScoreGrid = {
      rows: 1,
      zones: [
        { category: "a", columns: 1 },
        { category: "a", columns: 1 },
      ],
    };

    expect(gridLines(split, ["2", "3"])).toEqual({ a: "5" });
    expect(gridLines(split, ["", "3"])).toEqual({ a: "" });
    expect(gridLines(split, ["2", ""])).toEqual({ a: "" });
  });
});

describe("seedCells", () => {
  it("opens recorded lines in their first cell, the rest at 0", () => {
    expect(seedCells(MARE, { left: "7", centre: "12" })).toEqual([
      "7",
      "0",
      "12",
      "0",
      "0",
      "0",
      "",
      "",
    ]);
  });

  it("seeds a line split over two zones once", () => {
    const split: ScoreGrid = {
      rows: 1,
      zones: [
        { category: "a", columns: 1 },
        { category: "a", columns: 1 },
      ],
    };

    expect(seedCells(split, { a: "5" })).toEqual(["5", "0"]);
  });
});
