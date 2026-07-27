import { describe, expect, it } from "vitest";

import { hiddenMaterial } from "./hidden-material";
import type { ScenarioBoardSpec, ScenarioZone } from "./scenario-spec";

/** A zone under the name, bag and tokens given — three spaces unless said. */
function zone(overrides: Partial<ScenarioZone> = {}): ScenarioZone {
  return {
    name: "Île",
    cells: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ],
    terrainCounts: { forest: 2, desert: 1 },
    numberTokens: [4, 5],
    ...overrides,
  };
}

/** A board made of the zones given, for three players. */
function board(...zones: ScenarioZone[]): ScenarioBoardSpec {
  return { players: [3], zones };
}

describe("hiddenMaterial", () => {
  it("has nothing to prepare on a map with no fog", () => {
    expect(hiddenMaterial(board(zone(), zone({ hidden: false })))).toEqual([]);
  });

  it("hands out the bag of a face-down zone, sea included", () => {
    const material = hiddenMaterial(
      board(
        zone(),
        zone({
          name: "Brume",
          hidden: true,
          terrainCounts: { sea: 2, forest: 1, gold: 1 },
          numberTokens: [8, 3],
        }),
      ),
    );

    expect(material).toEqual([
      {
        name: "Brume",
        terrainCounts: { sea: 2, forest: 1, gold: 1 },
        tokens: [3, 8],
        tiles: 4,
      },
    ]);
  });

  it("keeps the piles apart when two zones are face down", () => {
    const material = hiddenMaterial(
      board(
        zone({ name: "Brume ouest", hidden: true }),
        zone({ name: "Brume est", hidden: true, numberTokens: [10, 6] }),
      ),
    );

    expect(material.map(m => m.name)).toEqual(["Brume ouest", "Brume est"]);
    expect(material[1].tokens).toEqual([6, 10]);
  });

  it("leaves the zone's own bag untouched when sorting its tokens", () => {
    const fog = zone({ hidden: true, numberTokens: [9, 2] });

    hiddenMaterial(board(fog));

    expect(fog.numberTokens).toEqual([9, 2]);
  });
});
