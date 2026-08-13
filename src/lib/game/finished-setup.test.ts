import { describe, expect, it } from "vitest";

import type { Boardgame, Extension, RoundGoal } from "@/lib/domain";

import { finishedSetup } from "./finished-setup";

const SHEET = [{ key: "oiseaux", label: "Oiseaux" }];

const TOTAL_BIRDS: RoundGoal = {
  key: "totalBirds",
  label: "Oiseaux au total",
  params: [],
};
const NO_GOAL: RoundGoal = {
  key: "noGoal",
  label: "Pas d'objectif",
  params: [],
  scores: false,
  extraTurn: 1,
};

function boardgame(partial: Partial<Boardgame>): Boardgame {
  return {
    scoring: { sheet: SHEET },
    roundGoals: [TOTAL_BIRDS],
    stages: null,
    ...partial,
  } as Boardgame;
}

function extension(partial: Partial<Extension>): Extension {
  return { roundGoals: [], scoringDelta: null, ...partial } as Extension;
}

describe("finishedSetup", () => {
  it("has nothing to lay out while no game is chosen", () => {
    const setup = finishedSetup(null, []);

    expect(setup).toEqual({
      scoring: null,
      catalogue: [],
      schedule: [],
      stageLabel: "Manche",
    });
  });

  it("reads the calendar and its wording off a scheduled game", () => {
    const setup = finishedSetup(
      boardgame({
        stages: {
          label: "Manche",
          advance: "schedule",
          schedule: [8, 7, 6, 5],
        },
      }),
      [],
    );

    expect(setup.schedule).toEqual([8, 7, 6, 5]);
    expect(setup.stageLabel).toBe("Manche");
  });

  it("gives no calendar to a scheduled game that never wrote one down", () => {
    const setup = finishedSetup(
      boardgame({ stages: { label: "Manche", advance: "schedule" } }),
      [],
    );

    expect(setup.schedule).toEqual([]);
  });

  it("gives no calendar to a game whose stages end on a pass", () => {
    const setup = finishedSetup(
      boardgame({ stages: { label: "Génération", advance: "pass" } }),
      [],
    );

    expect(setup.schedule).toEqual([]);
    expect(setup.stageLabel).toBe("Génération");
  });

  it("puts the extensions' own line and tiles in reach", () => {
    const setup = finishedSetup(boardgame({}), [
      extension({
        roundGoals: [NO_GOAL],
        scoringDelta: { appendSheet: [{ key: "nectar", label: "Nectar" }] },
      }),
    ]);

    expect(setup.catalogue.map(g => g.key)).toEqual(["totalBirds", "noGoal"]);
    expect(setup.scoring?.sheet?.map(i => i.label)).toEqual([
      "Oiseaux",
      "Nectar",
    ]);
  });

  it("leaves an unscored game unscored, extensions or not", () => {
    const setup = finishedSetup(boardgame({ scoring: null }), []);

    expect(setup.scoring).toBeNull();
  });
});
