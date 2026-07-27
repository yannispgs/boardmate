import { describe, expect, it } from "vitest";

import { parseScenarioSpec, scenarioSpecSchema } from "./scenario-schema";
import type { ScenarioSpec } from "./scenario-spec";

/** A spec exercising every optional the format allows. */
const full: ScenarioSpec = {
  name: "Les quatre îles",
  targetScore: 14,
  boards: [
    {
      players: [3],
      zones: [
        {
          name: "Île",
          cells: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
          ],
          terrainCounts: { forest: 1, sea: 1 },
          numberTokens: [5],
          hidden: true,
          islands: [1, 2],
          ports: {
            slots: [{ q: 0, r: 0, dq: 0, dr: -1 }],
            types: ["wood"],
          },
        },
      ],
      statics: [{ cell: { q: 5, r: 3 }, terrain: "mountains", number: 9 }],
    },
  ],
  options: { avoidReds: false, tolerancePct: 35, terrainN: 120 },
};

describe("scenarioSpecSchema", () => {
  it("reads back a spec holding every optional untouched", () => {
    expect(scenarioSpecSchema.parse(full)).toEqual(full);
  });

  it("reads back a spec holding none of them", () => {
    const bare: ScenarioSpec = {
      name: "Nu",
      targetScore: 10,
      boards: [
        {
          players: [4],
          zones: [
            {
              name: "Mer",
              cells: [{ q: 0, r: 0 }],
              terrainCounts: { sea: 1 },
              numberTokens: [],
            },
          ],
        },
      ],
    };

    expect(scenarioSpecSchema.parse(bare)).toEqual(bare);
  });

  it("drops what the format doesn't declare", () => {
    const parsed = scenarioSpecSchema.parse({
      ...full,
      isOfficial: true,
    });

    expect(parsed).toEqual(full);
  });
});

describe("parseScenarioSpec", () => {
  it("hands back a scenario that parses", () => {
    expect(parseScenarioSpec(full)).toEqual(full);
  });

  it("has nothing to hand back on a row that carries no spec", () => {
    expect(parseScenarioSpec(null)).toBeNull();
    expect(parseScenarioSpec(undefined)).toBeNull();
  });

  it("refuses a blob that isn't a scenario at all", () => {
    expect(parseScenarioSpec("four-islands")).toBeNull();
    expect(parseScenarioSpec([])).toBeNull();
    expect(parseScenarioSpec({})).toBeNull();
  });

  it("refuses a terrain or a harbour the game doesn't have", () => {
    const zone = full.boards[0].zones[0];

    expect(
      parseScenarioSpec({
        ...full,
        boards: [
          {
            ...full.boards[0],
            zones: [{ ...zone, terrainCounts: { lava: 1 } }],
          },
        ],
      }),
    ).toBeNull();

    expect(
      parseScenarioSpec({
        ...full,
        boards: [
          {
            ...full.boards[0],
            zones: [{ ...zone, ports: { types: ["gold"] } }],
          },
        ],
      }),
    ).toBeNull();
  });

  it("refuses a blob big enough to bog the generator down", () => {
    const cells = Array.from({ length: 5000 }, (_, i) => ({ q: i, r: 0 }));

    expect(
      parseScenarioSpec({
        ...full,
        boards: [
          {
            ...full.boards[0],
            zones: [{ ...full.boards[0].zones[0], cells }],
          },
        ],
      }),
    ).toBeNull();

    // Every candidate is a whole board drawn and scored before one is kept.
    expect(
      parseScenarioSpec({ ...full, options: { numberN: 10_000_000 } }),
    ).toBeNull();
  });
});
