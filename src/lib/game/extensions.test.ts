import { describe, expect, it } from "vitest";

import type {
  Extension,
  ExtensionId,
  ExtensionScenarioId,
  FieldSpec,
  ScoringSpec,
} from "@/lib/domain";
import {
  composeConfigFields,
  composeScoring,
  scenarioTarget,
  winTargetWithModifiers,
} from "./extensions";

function ext(
  partial: Omit<Partial<Extension>, "id"> & { id: string },
): Extension {
  return {
    id: partial.id as ExtensionId,
    baseGameId: "bg" as never,
    name: partial.name ?? partial.id,
    configFields: partial.configFields ?? [],
    scoringDelta: partial.scoringDelta ?? null,
    targetModifier: partial.targetModifier ?? 0,
    hasScenarios: partial.hasScenarios ?? false,
    changesBoard: false,
    isActive: true,
    sortOrder: partial.sortOrder ?? 0,
    scenarios: partial.scenarios ?? [],
  };
}

const intField = (key: string, def: number): FieldSpec =>
  ({ key, label: key, type: "integer", default: def }) as FieldSpec;

describe("composeConfigFields", () => {
  it("returns the base fields unchanged with no extensions", () => {
    const base = [intField("pointsToWin", 10)];

    expect(composeConfigFields(base, [])).toEqual(base);
  });

  it("overrides a base field by key and appends new ones, in sortOrder", () => {
    const base = [intField("pointsToWin", 10), intField("turnBaseS", 45)];
    const fields = composeConfigFields(base, [
      ext({
        id: "b",
        sortOrder: 2,
        configFields: [intField("pointsToWin", 15)],
      }),
      ext({
        id: "a",
        sortOrder: 1,
        configFields: [intField("pointsToWin", 13)],
      }),
      ext({ id: "c", sortOrder: 3, configFields: [intField("scenarioX", 1)] }),
    ]);

    // pointsToWin overridden (last-in-order = sortOrder 2 → 15), position kept;
    // new field appended after the base fields.
    expect(fields.map(f => f.key)).toEqual([
      "pointsToWin",
      "turnBaseS",
      "scenarioX",
    ]);
    expect(fields.find(f => f.key === "pointsToWin")).toMatchObject({
      default: 15,
    });
  });
});

describe("composeScoring", () => {
  const sheetBase: ScoringSpec = {
    timing: "final",
    entry: "categories",
    winCondition: { type: "highest" },
    sheet: [{ key: "a", label: "A" }],
  };

  it("returns null when the base is unscored", () => {
    expect(composeScoring(null, [ext({ id: "x" })])).toBeNull();
  });

  it("appends category additions to a base sheet", () => {
    const composed = composeScoring(sheetBase, [
      ext({
        id: "pays",
        scoringDelta: { appendSheet: [{ key: "paysages", label: "Paysages" }] },
      }),
    ]);

    expect(composed?.sheet?.map(i => ("key" in i ? i.key : ""))).toEqual([
      "a",
      "paysages",
    ]);
  });

  it("leaves the base untouched with no additions or no base sheet", () => {
    expect(composeScoring(sheetBase, [ext({ id: "x" })])).toBe(sheetBase);

    const totalBase: ScoringSpec = {
      timing: "live",
      entry: "total",
      winCondition: { type: "highest" },
    };

    expect(
      composeScoring(totalBase, [
        ext({
          id: "y",
          scoringDelta: { appendSheet: [{ key: "z", label: "Z" }] },
        }),
      ]),
    ).toBe(totalBase);
  });
});

describe("scenarioTarget", () => {
  const marins = ext({
    id: "marins",
    hasScenarios: true,
    scenarios: [
      {
        id: "s1" as ExtensionScenarioId,
        extensionId: "marins" as ExtensionId,
        name: "Four Islands",
        targetScore: 13,
        boardKey: "four-islands",
        sortOrder: 0,
      },
      {
        id: "s2" as ExtensionScenarioId,
        extensionId: "marins" as ExtensionId,
        name: "No target",
        targetScore: null,
        boardKey: null,
        sortOrder: 1,
      },
    ],
  });

  it("returns null when no scenario is selected", () => {
    expect(scenarioTarget([marins], {})).toBeNull();
  });

  it("returns the selected scenario's target", () => {
    expect(
      scenarioTarget([marins], { marins: "s1" as ExtensionScenarioId }),
    ).toBe(13);
  });

  it("skips a selection whose scenario is missing or has no target", () => {
    expect(
      scenarioTarget([marins], { marins: "s2" as ExtensionScenarioId }),
    ).toBeNull();
    expect(
      scenarioTarget([marins], {
        marins: "gone" as ExtensionScenarioId,
      }),
    ).toBeNull();
  });
});

describe("winTargetWithModifiers", () => {
  it("keeps null base as null", () => {
    expect(
      winTargetWithModifiers(null, [ext({ id: "x", targetModifier: 2 })]),
    ).toBeNull();
  });

  it("adds positive modifiers and ignores negative ones", () => {
    expect(
      winTargetWithModifiers(13, [
        ext({ id: "a", targetModifier: 2 }),
        ext({ id: "b", targetModifier: -5 }),
        ext({ id: "c", targetModifier: 1 }),
      ]),
    ).toBe(16);
  });
});
