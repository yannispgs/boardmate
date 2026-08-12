import { describe, expect, it } from "vitest";

import type {
  Extension,
  ExtensionId,
  ExtensionScenarioId,
  FieldSpec,
} from "@/lib/domain";
import { winTargetView } from "./win-target";

function ext(partial: Omit<Partial<Extension>, "id"> & { id: string }) {
  return {
    id: partial.id as ExtensionId,
    baseGameId: "bg" as never,
    key: partial.key ?? null,
    name: partial.name ?? partial.id,
    configFields: [],
    scoringDelta: null,
    roundGoals: [],
    targetModifier: partial.targetModifier ?? 0,
    hasScenarios: partial.hasScenarios ?? false,
    changesBoard: false,
    isActive: true,
    sortOrder: 0,
    scenarios: partial.scenarios ?? [],
  } as Extension;
}

const target = (min?: number, max?: number): FieldSpec =>
  ({
    key: "pointsToWin",
    label: "Points",
    type: "integer",
    default: 10,
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
  }) as FieldSpec;

const option = (key: string, modifier: number, label = key): FieldSpec =>
  ({
    key,
    label,
    type: "boolean",
    default: false,
    targetModifier: modifier,
  }) as FieldSpec;

describe("winTargetView", () => {
  it("shows no bar when the game does not aim at a target", () => {
    expect(winTargetView(null, [], null, [], {})).toEqual({
      field: null,
      bar: null,
    });
  });

  it("shows no bar when the target field is missing from the template", () => {
    const view = winTargetView(
      { type: "scoreTarget", field: "pointsToWin" },
      [],
      null,
      [],
      {},
    );

    expect(view.field).toBe("pointsToWin");
    expect(view.bar).toBeNull();
  });

  it("reads the editable target, its bounds and no lock", () => {
    const view = winTargetView(
      { type: "scoreTarget", field: "pointsToWin" },
      [target(5, 20)],
      { pointsToWin: 12 },
      [],
      {},
    );

    expect(view.bar).toEqual({
      locked: null,
      note: "Imposé par le scénario.",
      value: 12,
      min: 5,
      max: 20,
      bonus: null,
    });
  });

  it("leaves the value empty while the field is being cleared", () => {
    const view = winTargetView(
      { type: "scoreTarget", field: "pointsToWin" },
      [target()],
      { pointsToWin: "" },
      [],
      {},
    );

    expect(view.bar?.value).toBe("");
    expect(view.bar?.min).toBeUndefined();
    expect(view.bar?.max).toBeUndefined();
  });

  it("leaves the value empty while the form has no values yet", () => {
    const view = winTargetView(
      { type: "scoreTarget", field: "pointsToWin" },
      [target(5, 20)],
      null,
      [],
      {},
    );

    expect(view.bar?.value).toBe("");
    expect(view.bar?.bonus).toBeNull();
  });

  it("spells out what the options switched on add to the base", () => {
    const view = winTargetView(
      { type: "scoreTarget", field: "pointsToWin" },
      [target(), option("harbour", 1, "Maître du port"), option("off", 2)],
      { pointsToWin: 10, harbour: true, off: false },
      [],
      {},
    );

    expect(view.bar?.value).toBe(10);
    expect(view.bar?.bonus).toEqual({
      label: "+1 Maître du port",
      total: 11,
    });
  });

  it("drops the bonus while the base is being cleared", () => {
    const view = winTargetView(
      { type: "scoreTarget", field: "pointsToWin" },
      [target(), option("harbour", 1)],
      { pointsToWin: "", harbour: true },
      [],
      {},
    );

    expect(view.bar?.bonus).toBeNull();
  });

  it("locks the target a scenario imposes, raised by options and extensions", () => {
    const marins = ext({
      id: "marins",
      hasScenarios: true,
      targetModifier: 2,
      scenarios: [
        { id: "s1" as ExtensionScenarioId, targetScore: 12 } as never,
      ],
    });

    const view = winTargetView(
      { type: "scoreTarget", field: "pointsToWin" },
      [target(), option("harbour", 1, "Maître du port")],
      { pointsToWin: 10, harbour: true },
      [marins],
      { marins: "s1" as ExtensionScenarioId },
    );

    // 12 (scenario) + 1 (option) + 2 (extension modifier).
    expect(view.bar?.locked).toBe(15);
    expect(view.bar?.note).toBe(
      "Imposé par le scénario (relevé par les options et extensions actives).",
    );
  });

  it("shows a scenario's target even when the game names no target field", () => {
    const marins = ext({
      id: "marins",
      hasScenarios: true,
      scenarios: [
        { id: "s1" as ExtensionScenarioId, targetScore: 12 } as never,
      ],
    });

    const view = winTargetView(null, [], null, [marins], {
      marins: "s1" as ExtensionScenarioId,
    });

    expect(view.field).toBeNull();
    expect(view.bar?.locked).toBe(12);
    expect(view.bar?.value).toBe("");
  });
});
