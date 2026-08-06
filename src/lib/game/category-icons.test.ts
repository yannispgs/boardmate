import { describe, expect, it } from "vitest";

import type { ScoreSheetItem } from "@/lib/domain";

import {
  CATEGORY_ICONS,
  categoryIconOf,
  isCategoryIconId,
  sheetIconLegend,
} from "./category-icons";

describe("CATEGORY_ICONS", () => {
  it("names every drawing exactly once", () => {
    const ids = CATEGORY_ICONS.map(icon => icon.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every drawing a name for the picker", () => {
    expect(CATEGORY_ICONS.every(icon => icon.name.trim() !== "")).toBe(true);
  });
});

describe("isCategoryIconId", () => {
  it("accepts a drawing the app ships", () => {
    expect(isCategoryIconId("tree")).toBe(true);
  });

  it("rejects anything else a JSONB sheet may hold", () => {
    expect(isCategoryIconId("dragon")).toBe(false);
    expect(isCategoryIconId(undefined)).toBe(false);
    expect(isCategoryIconId(null)).toBe(false);
    expect(isCategoryIconId(42)).toBe(false);
  });
});

describe("categoryIconOf", () => {
  it("reads the line's drawing", () => {
    expect(categoryIconOf({ key: "a", label: "Arbres", icon: "tree" })).toBe(
      "tree",
    );
  });

  it("falls back to text when the line names no drawing", () => {
    expect(categoryIconOf({ key: "a", label: "Arbres" })).toBeNull();
  });

  it("falls back to text when the drawing is unknown", () => {
    expect(
      categoryIconOf({ key: "a", label: "Arbres", icon: "gone" }),
    ).toBeNull();
  });
});

describe("sheetIconLegend", () => {
  const sheet: ScoreSheetItem[] = [
    { key: "trees", label: "Arbres", icon: "tree" },
    { key: "plain", label: "Grotte" },
    {
      label: "Animaux",
      categories: [
        { key: "birds", label: "Oiseaux", icon: "bird" },
        { key: "fish", label: "Poissons", icon: "unknown-one" },
      ],
    },
  ];

  it("spells out every drawing, in the order the sheet lays them out", () => {
    expect(sheetIconLegend(sheet)).toEqual([
      { key: "trees", icon: "tree", label: "Arbres" },
      { key: "birds", icon: "bird", label: "Oiseaux" },
    ]);
  });

  it("says nothing for a sheet that uses no drawing", () => {
    expect(sheetIconLegend([{ key: "a", label: "Total" }])).toEqual([]);
  });

  it("keys entries by the line, so two lines may share a drawing", () => {
    const shared: ScoreSheetItem[] = [
      { key: "left", label: "Gauche", icon: "tree" },
      { key: "right", label: "Droite", icon: "tree" },
    ];
    const keys = sheetIconLegend(shared).map(entry => entry.key);

    expect(new Set(keys).size).toBe(2);
  });
});
