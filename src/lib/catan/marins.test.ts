import { describe, expect, it } from "vitest";

import {
  boardWarnings,
  buildNeighbours,
  type CatanTerrain,
  mulberry32,
} from "./board";
import {
  canvasCells,
  generateMarinsBoard,
  generateSpecBoard,
  growIslands,
  islandSizes,
  MARINS_SCENARIOS,
  marinsBoardFor,
  marinsPlayerGroups,
  marinsScenario,
  pickPortSlots,
  playerGroupLabel,
} from "./marins";
import type { ScenarioSpec, SpecCell } from "./scenario-spec";
import { boardTotals, cellKey } from "./scenario-spec";

const NEW_WORLD = marinsScenario("new-world").spec;
const NEW_WORLD_BOARD = NEW_WORLD.boards[0];

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

/** A one-row strip of `length` spaces on row `r`. */
function strip(length: number, r = 0): SpecCell[] {
  return canvasCells([[r, 0, length - 1]]);
}

describe("scenario catalogue", () => {
  it("resolves a scenario key to its spec", () => {
    const scenario = marinsScenario("new-world");

    expect(scenario.spec.name).toBe("Le Nouveau Monde");
    expect(scenario.spec.targetScore).toBe(12);
    expect(MARINS_SCENARIOS).toContain(scenario);
  });

  it("ships 23 land tiles, 9 harbours and a 42-space canvas for Le Nouveau Monde", () => {
    const totals = boardTotals(NEW_WORLD_BOARD);

    expect(totals.land).toBe(23);
    expect(totals.sea).toBe(19);
    expect(totals.ports).toBe(9);
    expect(NEW_WORLD_BOARD.zones[0].cells).toHaveLength(42);
    expect(totals.numberTokens.length).toBeGreaterThanOrEqual(totals.land);
  });

  it("groups the player counts that share one map", () => {
    expect(marinsPlayerGroups(NEW_WORLD)).toEqual([[3, 4]]);
  });

  it("starts a new group per board and sorts each one", () => {
    const spec: ScenarioSpec = {
      ...NEW_WORLD,
      boards: [
        { ...NEW_WORLD_BOARD, players: [4, 3] },
        { ...NEW_WORLD_BOARD, players: [5] },
        { ...NEW_WORLD_BOARD, players: [6] },
      ],
    };

    expect(marinsPlayerGroups(spec)).toEqual([[3, 4], [5], [6]]);
  });

  it("labels a player group", () => {
    expect(playerGroupLabel([3, 4])).toBe("3-4 joueurs");
    expect(playerGroupLabel([5])).toBe("5 joueurs");
    expect(playerGroupLabel([1])).toBe("1 joueur");
  });

  it("finds the map used at an exact player count", () => {
    expect(marinsBoardFor(NEW_WORLD, 4)).toBe(NEW_WORLD_BOARD);
    expect(marinsBoardFor(NEW_WORLD, 6)).toBeUndefined();
  });
});

describe("canvasCells", () => {
  it("lays the rows out, left to right and top to bottom", () => {
    expect(
      canvasCells([
        [0, 0, 1],
        [1, -1, 0],
      ]),
    ).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
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

  it("keeps the islands apart on a real canvas", () => {
    const cells = NEW_WORLD_BOARD.zones[0].cells.map((c, id) => ({ id, ...c }));
    const neighbours = buildNeighbours(cells);
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
    const canvas = NEW_WORLD_BOARD.zones[0].cells;
    const grown = growIslands(
      buildNeighbours(canvas.map((c, id) => ({ id, ...c }))),
      23,
      islandSizes(23, 4, rng),
      rng,
    );
    const cells = grown.map((id, i) => ({ id: i, ...canvas[id] }));
    const land = new Set(cells.map(cellKey));
    const slots = pickPortSlots(cells, land, 9, rng);

    expect(slots).toHaveLength(9);
    expect(new Set(slots.map(s => s.hexId)).size).toBe(9);

    for (const slot of slots) {
      const cell = cells[slot.hexId];

      expect(land.has(cellKey({ q: cell.q + slot.dq, r: cell.r + slot.dr })));
    }
  });

  it("counts land outside the zone as inland, not as coast", () => {
    const cells = [{ id: 0, q: 0, r: 0 }];
    // The whole ring around the tile is land — held by another zone, so it is
    // not in `cells`, but it still blocks every edge.
    const ring = new Set([
      cellKey({ q: 0, r: 0 }),
      cellKey({ q: 1, r: 0 }),
      cellKey({ q: -1, r: 0 }),
      cellKey({ q: 0, r: 1 }),
      cellKey({ q: 0, r: -1 }),
      cellKey({ q: 1, r: -1 }),
      cellKey({ q: -1, r: 1 }),
    ]);

    expect(pickPortSlots(cells, ring, 3, rng)).toEqual([]);
  });

  it("doubles up on a tile when the coast is shorter than the harbour stack", () => {
    const cells = [
      { id: 0, q: 0, r: 0 },
      { id: 1, q: 1, r: 0 },
    ];
    const slots = pickPortSlots(cells, new Set(cells.map(cellKey)), 5, rng);

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
      expect(NEW_WORLD_BOARD.zones[0].numberTokens).toContain(hex.number);
      expect(hex.hidden).toBe(false);
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
    const spaces = new Set([...board.hexes, ...board.sea].map(cellKey));

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

describe("generateSpecBoard", () => {
  it("refuses a scenario that does not add up", () => {
    const spec: ScenarioSpec = {
      name: "Bancal",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Île",
              cells: strip(3),
              terrainCounts: { forest: 2 },
              numberTokens: [4, 5],
            },
          ],
        },
      ],
    };

    expect(() => generateSpecBoard(spec, 3)).toThrow(
      "« Bancal » est incohérent : La zone « Île » compte 3 cases pour 2 tuiles déclarées.",
    );
  });

  it("fills a zone with no sea in place, tiles shuffled inside it", () => {
    const spec: ScenarioSpec = {
      name: "Île fixe",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Île",
              cells: strip(3),
              terrainCounts: { forest: 2, desert: 1 },
              numberTokens: [4, 5],
            },
          ],
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 1);

    expect(board.hexes.map(h => cellKey(h))).toEqual(["0,0", "1,0", "2,0"]);
    expect(board.sea).toEqual([]);
    expect(board.hexes.filter(h => h.terrain === "desert")).toHaveLength(1);
  });

  it("scatters the land of a zone that draws its sea without asking for islands", () => {
    const spec: ScenarioSpec = {
      name: "Zone libre",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Large",
              cells: strip(6),
              terrainCounts: { forest: 2, pasture: 1, sea: 3 },
              numberTokens: [4, 5, 6],
            },
          ],
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 2);

    expect(board.hexes).toHaveLength(3);
    expect(board.sea).toHaveLength(3);
  });

  it("keeps a zone's harbours where the author pinned them", () => {
    const spec: ScenarioSpec = {
      name: "Ports épinglés",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Île",
              cells: strip(2),
              terrainCounts: { forest: 1, hills: 1 },
              numberTokens: [4, 5],
              ports: {
                slots: [
                  { q: 0, r: 0, dq: 0, dr: -1 },
                  { q: 1, r: 0, dq: 0, dr: 1 },
                ],
                types: ["generic", "wood"],
              },
            },
          ],
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 3);

    expect(board.ports.map(p => ({ ...p, type: undefined }))).toEqual([
      { hexId: 0, dq: 0, dr: -1, type: undefined },
      { hexId: 1, dq: 0, dr: 1, type: undefined },
    ]);
    expect(board.ports.map(p => p.type).sort()).toEqual(["generic", "wood"]);
  });

  it("keeps each zone's harbour types inside that zone", () => {
    const spec: ScenarioSpec = {
      name: "Deux îles",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Nord",
              cells: strip(3, 0),
              terrainCounts: { forest: 3 },
              numberTokens: [4, 5, 6],
              ports: { types: ["wood", "wood"] },
            },
            {
              name: "Sud",
              cells: strip(3, 3),
              terrainCounts: { hills: 3 },
              numberTokens: [8, 9, 10],
              ports: { types: ["ore", "ore"] },
            },
          ],
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 4);
    const north = new Set([0, 1, 2]);

    for (const port of board.ports) {
      expect(port.type).toBe(north.has(port.hexId) ? "wood" : "ore");
    }
  });

  it("lays a hidden zone face down and leaves the others face up", () => {
    const spec: ScenarioSpec = {
      name: "Brume",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Connue",
              cells: strip(2, 0),
              terrainCounts: { forest: 2 },
              numberTokens: [4, 5],
            },
            {
              name: "Brume",
              cells: strip(2, 3),
              terrainCounts: { gold: 1, desert: 1 },
              numberTokens: [9],
              hidden: true,
            },
          ],
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 5);

    expect(board.hexes.filter(h => h.hidden).map(h => h.id)).toEqual([2, 3]);
    expect(board.hexes.filter(h => h.terrain === "gold")).toHaveLength(1);
  });

  it("pins a static tile's space, terrain and token", () => {
    const spec: ScenarioSpec = {
      name: "Statiques",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Île",
              cells: strip(2),
              terrainCounts: { forest: 2 },
              numberTokens: [4, 5],
            },
          ],
          statics: [
            { cell: { q: 0, r: 2 }, terrain: "mountains", number: 9 },
            { cell: { q: 1, r: 2 }, terrain: "desert" },
            { cell: { q: 2, r: 2 }, terrain: "sea" },
          ],
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 6);
    const at = (q: number, r: number) =>
      board.hexes.find(h => h.q === q && h.r === r);

    expect(at(0, 2)).toMatchObject({ terrain: "mountains", number: 9 });
    expect(at(1, 2)).toMatchObject({ terrain: "desert", number: null });
    expect(board.sea.map(cellKey)).toEqual(["2,2"]);
  });

  it("lays the tokens anyway when no shuffle can satisfy the rules", () => {
    // Two neighbouring spaces, two reds: whatever the draw, they end up side by
    // side. A board that breaks the rule still beats one with no production.
    const spec: ScenarioSpec = {
      name: "Impossible",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Île",
              cells: strip(2),
              terrainCounts: { forest: 1, hills: 1 },
              numberTokens: [6, 8],
            },
          ],
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 7);

    expect(board.hexes.map(h => h.number).sort()).toEqual([6, 8]);
  });
});
