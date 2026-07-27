import { describe, expect, it } from "vitest";

import {
  DEFAULT_GENERATOR_OPTIONS,
  type GeneratorOptions,
  MARINS_GENERATOR_OPTIONS,
  scenarioOptions,
  toBoardOptions,
} from "./generator-options";
import { MARINS_OPTIONS } from "./marins";

describe("toBoardOptions", () => {
  it("hands the engine the settings it understands", () => {
    expect(toBoardOptions(DEFAULT_GENERATOR_OPTIONS)).toEqual({
      desertInnerRing: false,
      desertOuterRing: false,
      allowAdjacentDeserts: false,
      ignoreConstraints: false,
      balanceTolerance: 0.2,
      balanceZones: false,
      avoidAdjacentReds: true,
      avoidAdjacentDuplicates: true,
      avoidResourceClusters: true,
      balanceIntersections: true,
      penalizeResourceVariance: true,
      limitIntersectionPips: true,
      maxIntersectionPips: 12,
      avoidPortOnResource: false,
      terrainCandidates: 60,
      numberCandidates: 75,
    });
  });

  it("turns the tolerance from a percentage into a fraction", () => {
    const strict: GeneratorOptions = {
      ...DEFAULT_GENERATOR_OPTIONS,
      tolerancePct: 45,
    };

    expect(toBoardOptions(strict).balanceTolerance).toBeCloseTo(0.45);
  });

  it("names the board to build only when it is asked to", () => {
    expect(toBoardOptions(DEFAULT_GENERATOR_OPTIONS)).not.toHaveProperty(
      "variant",
    );
    expect(toBoardOptions(DEFAULT_GENERATOR_OPTIONS, "extension").variant).toBe(
      "extension",
    );
  });
});

describe("MARINS_GENERATOR_OPTIONS", () => {
  it("starts a scenario on the rules a Marins board is drawn under", () => {
    expect(toBoardOptions(MARINS_GENERATOR_OPTIONS)).toMatchObject(
      MARINS_OPTIONS,
    );
  });
});

describe("scenarioOptions", () => {
  it("draws a scenario that saved nothing on the Marins defaults", () => {
    expect(scenarioOptions()).toEqual(MARINS_GENERATOR_OPTIONS);
    expect(scenarioOptions({})).toEqual(MARINS_GENERATOR_OPTIONS);
  });

  it("keeps what the author saved and defaults the rest", () => {
    const drawn = scenarioOptions({ avoidReds: false, terrainN: 200 });

    expect(drawn.avoidReds).toBe(false);
    expect(drawn.terrainN).toBe(200);
    expect(drawn.avoidPortRes).toBe(MARINS_GENERATOR_OPTIONS.avoidPortRes);
    expect(drawn.tolerancePct).toBe(MARINS_GENERATOR_OPTIONS.tolerancePct);
  });
});
