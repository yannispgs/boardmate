import { describe, expect, it } from "vitest";

import type { StageSpec } from "@/lib/domain";

import { tallyExitLabels } from "./tally-labels";

const ODIN: StageSpec = {
  label: "Manche",
  advance: "manual",
  maxPoints: 9,
  singleExit: true,
};

const PAPAYOO: StageSpec = {
  label: "Manche",
  advance: "manual",
  maxPoints: 250,
  stageTotal: 250,
  stagesPerPlayer: 1,
};

describe("tallyExitLabels", () => {
  it("calls a zero a sortie when the manche ends on somebody going out", () => {
    expect(tallyExitLabels(ODIN)).toMatchObject({
      heading: "Qui sort le plus souvent",
      event: "sortie",
      column: "Sorties",
    });
  });

  it("calls it a manche à 0 when nobody goes out", () => {
    expect(tallyExitLabels(PAPAYOO)).toMatchObject({
      heading: "Qui finit le plus souvent à 0",
      event: "manche à 0",
      column: "Manches à 0",
    });
  });

  it("assumes nobody goes out when the game says nothing about it", () => {
    expect(tallyExitLabels(null).column).toBe("Manches à 0");
    expect(tallyExitLabels({ label: "Manche", advance: "manual" }).column).toBe(
      "Manches à 0",
    );
  });
});
