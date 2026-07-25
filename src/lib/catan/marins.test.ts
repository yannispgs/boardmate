import { describe, expect, it } from "vitest";

import {
  boardWarnings,
  buildNeighbours,
  type CatanTerrain,
  mulberry32,
} from "./board";
import {
  frameCells,
  generateMarinsBoard,
  growIslands,
  islandSizes,
  landTileCount,
  MARINS_SCENARIOS,
  type MarinsScenario,
  marinsPlayerCounts,
  marinsPlayerGroups,
  marinsScenario,
  pickPortSlots,
  playerGroupLabel,
} from "./marins";

const NEW_WORLD = marinsScenario("new-world").compositions[3];

/** The land ids of `land`, grouped into connected islands. */
function islandsOf(land: number[], neighbours: number[][]): number[][] {
  const left = new Set(land);
  const islands: number[][] = [];

  while (left.size > 0) {
    const [seed] = left;
    const island = [seed];

    left.delete(seed);

    for (let i = 0; i < island.length; i++) {
      for (const n of neighbours[island[i]]) {
        if (left.has(n)) {
          left.delete(n);
          island.push(n);
        }
      }
    }

    islands.push(island);
  }

  return islands;
}

describe("scenario catalogue", () => {
  it("resolves a scenario key to its data", () => {
    const scenario = marinsScenario("new-world");

    expect(scenario.name).toBe("Le Nouveau Monde");
    expect(scenario.targetScore).toBe(12);
    expect(MARINS_SCENARIOS).toContain(scenario);
  });

  it("ships 23 land tiles, 9 harbours and a 42-space frame for Le Nouveau Monde", () => {
    expect(landTileCount(NEW_WORLD)).toBe(23);
    expect(NEW_WORLD.portTypes).toHaveLength(9);
    expect(frameCells(NEW_WORLD.frame)).toHaveLength(42);
    expect(NEW_WORLD.numberTokens.length).toBeGreaterThanOrEqual(23);
  });

  it("lists the exact player counts a scenario has a map for", () => {
    expect(marinsPlayerCounts(marinsScenario("new-world"))).toEqual([3, 4]);
  });

  it("groups the player counts that share one map", () => {
    expect(marinsPlayerGroups(marinsScenario("new-world"))).toEqual([[3, 4]]);
  });

  it("starts a new group when the map changes", () => {
    const twoMaps: MarinsScenario = {
      key: "new-world",
      name: "Deux cartes",
      targetScore: 13,
      compositions: {
        3: NEW_WORLD,
        4: NEW_WORLD,
        5: { ...NEW_WORLD },
        6: { ...NEW_WORLD },
      },
    };

    expect(marinsPlayerGroups(twoMaps)).toEqual([[3, 4], [5], [6]]);
  });

  it("labels a player group", () => {
    expect(playerGroupLabel([3, 4])).toBe("3-4 joueurs");
    expect(playerGroupLabel([5])).toBe("5 joueurs");
    expect(playerGroupLabel([1])).toBe("1 joueur");
  });
});

describe("frameCells", () => {
  it("lays the rows out and numbers the spaces in order", () => {
    expect(
      frameCells([
        [0, 0, 1],
        [1, -1, 0],
      ]),
    ).toEqual([
      { id: 0, q: 0, r: 0 },
      { id: 1, q: 1, r: 0 },
      { id: 2, q: -1, r: 1 },
      { id: 3, q: 0, r: 1 },
    ]);
  });
});

describe("islandSizes", () => {
  it("gives every island at least two tiles and spends the whole stack", () => {
    const rng = mulberry32(7);

    for (let count = 2; count <= 5; count++) {
      const sizes = islandSizes(23, count, rng);

      expect(sizes).toHaveLength(count);
      expect(sizes.reduce((sum, n) => sum + n, 0)).toBe(23);
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(2);
    }
  });

  it("piles the extra tiles on the first island when the draw is low", () => {
    expect(islandSizes(10, 3, () => 0)).toEqual([6, 2, 2]);
  });
});

describe("growIslands", () => {
  const rng = mulberry32(3);

  it("keeps the islands apart on a real frame", () => {
    const frame = frameCells(NEW_WORLD.frame);
    const neighbours = buildNeighbours(frame);
    const land = growIslands(neighbours, 23, islandSizes(23, 4, rng), rng);

    expect(land).toHaveLength(23);
    expect(new Set(land).size).toBe(23);
    expect(islandsOf(land, neighbours).length).toBeGreaterThan(1);
  });

  it("stops seeding once the land is all laid", () => {
    expect(growIslands([[1], [0]], 1, [2, 2], rng)).toHaveLength(1);
  });

  it("stops seeding when no space is far enough from the land", () => {
    expect(growIslands([[1], [0]], 2, [1, 1], rng)).toEqual([0, 1]);
  });

  it("falls back to a landlocked space when no coast is left", () => {
    // Space 2 touches nothing: the island can't grow onto it, and it is not
    // coastal either — the last tile has to go there anyway.
    expect(growIslands([[1], [0], []], 3, [3], rng)).toEqual([0, 1, 2]);
  });
});

describe("pickPortSlots", () => {
  const rng = mulberry32(11);

  it("puts at most one harbour per tile, on an edge facing the sea", () => {
    const frame = frameCells(NEW_WORLD.frame);
    const land = growIslands(
      buildNeighbours(frame),
      23,
      islandSizes(23, 4, rng),
      rng,
    );
    const cells = land.map((id, i) => ({
      id: i,
      q: frame[id].q,
      r: frame[id].r,
    }));
    const slots = pickPortSlots(cells, buildNeighbours(cells), 9, rng);

    expect(slots).toHaveLength(9);
    expect(new Set(slots.map(s => s.hexId)).size).toBe(9);

    for (const slot of slots) {
      const cell = cells[slot.hexId];
      const inland = cells.some(
        c => c.q === cell.q + slot.dq && c.r === cell.r + slot.dr,
      );

      expect(inland).toBe(false);
    }
  });

  it("doubles up on a tile when the coast is shorter than the harbour stack", () => {
    const cells = [
      { id: 0, q: 0, r: 0 },
      { id: 1, q: 1, r: 0 },
    ];
    const slots = pickPortSlots(cells, buildNeighbours(cells), 5, rng);

    expect(slots).toHaveLength(5);
    expect(new Set(slots.map(s => s.hexId)).size).toBe(2);
  });
});

describe("generateMarinsBoard", () => {
  it("refuses a player count the scenario has no map for", () => {
    expect(() => generateMarinsBoard("new-world", 6)).toThrow(
      "« Le Nouveau Monde » n'a pas de plateau pour 6 joueurs.",
    );
  });

  it("draws the scenario's land, sea and harbours", () => {
    const { scenario, players, board, variant } = generateMarinsBoard(
      "new-world",
      3,
      42,
    );

    expect(scenario.key).toBe("new-world");
    expect(players).toBe(3);
    expect(board.variant).toBe("marins");
    expect(board.hexes).toHaveLength(23);
    expect(board.sea).toHaveLength(19);
    expect(board.ports).toHaveLength(9);
    expect(variant.cells).toHaveLength(23);
  });

  it("gives every land tile a terrain and a number from the box", () => {
    const { board } = generateMarinsBoard("new-world", 4, 8);
    const counts = {} as Record<CatanTerrain, number>;

    for (const hex of board.hexes) {
      counts[hex.terrain] = (counts[hex.terrain] ?? 0) + 1;
      expect(hex.number).not.toBeNull();
      expect(NEW_WORLD.numberTokens).toContain(hex.number);
    }

    expect(counts).toEqual({
      fields: 5,
      forest: 5,
      pasture: 5,
      hills: 4,
      mountains: 4,
    });
  });

  it("never puts land and sea on the same space", () => {
    const { board } = generateMarinsBoard("new-world", 3, 5);
    const spaces = new Set(
      [...board.hexes, ...board.sea].map(c => `${c.q},${c.r}`),
    );

    expect(spaces.size).toBe(42);
  });

  it("honours the placement rules the base generator enforces", () => {
    const { board, variant } = generateMarinsBoard("new-world", 3, 5);

    expect(boardWarnings(board, { variantSpec: variant })).toEqual([]);
  });

  it("is deterministic for a given seed", () => {
    expect(generateMarinsBoard("new-world", 3, 1234).board).toEqual(
      generateMarinsBoard("new-world", 3, 1234).board,
    );
  });

  it("draws its own seed when none is given", () => {
    const first = generateMarinsBoard("new-world", 3);
    const second = generateMarinsBoard("new-world", 3);

    expect(first.board.seed).not.toBe(second.board.seed);
  });
});
