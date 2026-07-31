import { describe, expect, it } from "vitest";

import {
  boardWarnings,
  buildNeighbours,
  type CatanTerrain,
  mulberry32,
} from "./board";
import {
  canvasCells,
  generateSpecBoard,
  growIslands,
  islandSizes,
  marinsBoardFor,
  marinsBoardIndex,
  marinsPlayerGroups,
  pickPortSlots,
  trySpecBoard,
} from "./marins";
import type { ScenarioSpec, SpecCell } from "./scenario-spec";
import {
  boardOutline,
  boardTotals,
  cellKey,
  DEFAULT_WIDTH,
  fixedSeaCells,
  isFixedSea,
} from "./scenario-spec";

const ARCHIPEL_WIDTH = 5;

/** The spaces a board of the default width fixes to the open sea. */
const FIXED_SEA = fixedSeaCells(DEFAULT_WIDTH).map(cellKey);

/** Everything an author may paint on the archipelago's board. */
const ARCHIPEL_CELLS = boardOutline(ARCHIPEL_WIDTH).filter(
  cell => !isFixedSea(ARCHIPEL_WIDTH, cell),
);

/**
 * A full-size map to draw against. The generator ships with no scenario of its
 * own — they are authored in the app and read back from the database — so the
 * geometry tests bring their own: 42 spaces to paint on, 23 land tiles spread
 * over 3 to 5 islands, 19 of sea, 9 harbours in the bag.
 */
const ARCHIPEL: ScenarioSpec = {
  name: "Archipel",
  targetScore: 12,
  boards: [
    {
      players: [3, 4],
      width: ARCHIPEL_WIDTH,
      zones: [
        {
          name: "Archipel",
          cells: ARCHIPEL_CELLS,
          terrainCounts: {
            fields: 5,
            forest: 5,
            pasture: 5,
            hills: 4,
            mountains: 4,
            sea: 19,
          },
          numberTokens: [
            2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11,
            11, 12,
          ],
          islands: [3, 5],
          ports: {
            types: [
              "generic",
              "generic",
              "generic",
              "generic",
              "wood",
              "brick",
              "wool",
              "grain",
              "ore",
            ],
          },
        },
      ],
    },
  ],
};

const ARCHIPEL_BOARD = ARCHIPEL.boards[0];

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

describe("scenario maps", () => {
  it("counts the land, the sea and the harbours of a map", () => {
    const totals = boardTotals(ARCHIPEL_BOARD);

    expect(totals.land).toBe(23);
    expect(totals.sea).toBe(19);
    expect(totals.ports).toBe(9);
    expect(ARCHIPEL_BOARD.zones[0].cells).toHaveLength(42);
    expect(totals.numberTokens.length).toBeGreaterThanOrEqual(totals.land);
  });

  it("groups the player counts that share one map", () => {
    expect(marinsPlayerGroups(ARCHIPEL)).toEqual([[3, 4]]);
  });

  it("starts a new group per board and sorts each one", () => {
    const spec: ScenarioSpec = {
      ...ARCHIPEL,
      boards: [
        { ...ARCHIPEL_BOARD, players: [4, 3] },
        { ...ARCHIPEL_BOARD, players: [5] },
        { ...ARCHIPEL_BOARD, players: [6] },
      ],
    };

    expect(marinsPlayerGroups(spec)).toEqual([[3, 4], [5], [6]]);
  });

  it("finds the map used at an exact player count", () => {
    expect(marinsBoardFor(ARCHIPEL, 4)).toBe(ARCHIPEL_BOARD);
    expect(marinsBoardFor(ARCHIPEL, 6)).toBeUndefined();
  });

  it("says where that map sits, so an edit can name it", () => {
    const spec: ScenarioSpec = {
      ...ARCHIPEL,
      boards: [
        { ...ARCHIPEL_BOARD, players: [3] },
        { ...ARCHIPEL_BOARD, players: [5] },
      ],
    };

    expect(marinsBoardIndex(spec, 5)).toBe(1);
    expect(marinsBoardIndex(spec, 6)).toBe(-1);
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
    const cells = ARCHIPEL_BOARD.zones[0].cells.map((c, id) => ({ id, ...c }));
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

  // Nothing forbids two on a tile any more; keeping them apart is what leaves
  // them a tile each wherever the coast has the room for it.
  it("gives them a tile each on a coast with room, facing the sea", () => {
    const canvas = ARCHIPEL_BOARD.zones[0].cells;
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

  it("keeps the harbours apart instead of clumping them", () => {
    // A straight island of nine tiles. Wherever the opening harbour lands, the
    // next is the furthest candidate from it and the one after that the furthest
    // from both — so the three never come within three tiles of each other,
    // whatever the seed. A pure shuffle drops two of them side by side about a
    // third of the time.
    const cells = strip(9).map((c, id) => ({ id, ...c }));
    const land = new Set(cells.map(cellKey));

    for (let seed = 0; seed < 20; seed++) {
      const picked = pickPortSlots(cells, land, 3, mulberry32(seed))
        .map(slot => slot.hexId)
        .sort((a, b) => a - b);

      expect(picked[1] - picked[0]).toBeGreaterThanOrEqual(3);
      expect(picked[2] - picked[1]).toBeGreaterThanOrEqual(3);
    }
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

describe("generateSpecBoard, on a whole map", () => {
  it("refuses a player count the scenario has no map for", () => {
    expect(() => generateSpecBoard(ARCHIPEL, 6)).toThrow(
      "« Archipel » n'a pas de plateau pour 6 joueurs.",
    );
  });

  it("draws the scenario's land, sea and harbours", () => {
    const { spec, players, board, variant } = generateSpecBoard(
      ARCHIPEL,
      3,
      42,
    );

    expect(spec).toBe(ARCHIPEL_BOARD);
    expect(players).toBe(3);
    expect(board.variant).toBe("marins");
    expect(board.hexes).toHaveLength(23);
    expect(board.sea).toHaveLength(21);
    expect(board.ports).toHaveLength(9);
    expect(variant.cells).toHaveLength(23);
  });

  it("gives every land tile a terrain and a number from the box", () => {
    const { board } = generateSpecBoard(ARCHIPEL, 4, 8);
    const counts = {} as Record<CatanTerrain, number>;

    for (const hex of board.hexes) {
      counts[hex.terrain] = (counts[hex.terrain] ?? 0) + 1;

      expect(hex.number).not.toBeNull();
      expect(ARCHIPEL_BOARD.zones[0].numberTokens).toContain(hex.number);
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
    const { board } = generateSpecBoard(ARCHIPEL, 3, 5);
    const spaces = new Set([...board.hexes, ...board.sea].map(cellKey));

    expect(spaces.size).toBe(44);
  });

  it("honours the placement rules the base generator enforces", () => {
    const { board, variant } = generateSpecBoard(ARCHIPEL, 3, 5);

    expect(boardWarnings(board, { variantSpec: variant })).toEqual([]);
  });

  it("is deterministic for a given seed", () => {
    expect(generateSpecBoard(ARCHIPEL, 3, 1234).board).toEqual(
      generateSpecBoard(ARCHIPEL, 3, 1234).board,
    );
  });

  it("draws its own seed when none is given", () => {
    const first = generateSpecBoard(ARCHIPEL, 3);
    const second = generateSpecBoard(ARCHIPEL, 3);

    expect(first.board.seed).not.toBe(second.board.seed);
  });
});

describe("trySpecBoard", () => {
  it("hands the draw back when it comes out", () => {
    expect(trySpecBoard(ARCHIPEL, 3, 42)).toEqual({
      ok: true,
      drawn: generateSpecBoard(ARCHIPEL, 3, 42),
    });
  });

  it("hands the reason back instead of throwing", () => {
    expect(trySpecBoard(ARCHIPEL, 6)).toEqual({
      ok: false,
      reason: "« Archipel » n'a pas de plateau pour 6 joueurs.",
    });
  });
});

describe("generateSpecBoard, on a hand-built spec", () => {
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
    expect(board.sea.map(cellKey)).toEqual(FIXED_SEA);
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
    expect(board.sea).toHaveLength(3 + FIXED_SEA.length);
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

  it("keeps the harbours of the board's own bag on their fixed coast", () => {
    // The harbours a printed map sets outside every zone: pinned on static land
    // tiles, facing the static sea beside them.
    const spec: ScenarioSpec = {
      name: "Côte fixe",
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
            },
          ],
          statics: [
            { cell: { q: 2, r: 0 }, terrain: "mountains", number: 8 },
            { cell: { q: 3, r: 0 }, terrain: "sea" },
          ],
          ports: {
            slots: [{ q: 2, r: 0, dq: 1, dr: 0 }],
            types: ["grain"],
          },
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 5);
    const host = board.hexes.find(hex => cellKey(hex) === "2,0");

    expect(board.ports).toEqual([
      { hexId: host?.id, dq: 1, dr: 0, type: "grain" },
    ]);
  });

  it("draws nothing from a board bag the editor emptied", () => {
    // Stepping the last harbour of the board's bag back down to zero leaves the
    // bag itself behind, with neither a type nor a pin in it.
    const { board } = generateSpecBoard(
      {
        name: "Sac vide",
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
              },
            ],
            ports: { types: [] },
          },
        ],
      },
      3,
      5,
    );

    expect(board.ports).toEqual([]);
  });

  it("refuses a harbour pinned where the draw could put the sea", () => {
    expect(() =>
      generateSpecBoard(
        {
          name: "Côte incertaine",
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
                  ports: {
                    slots: [{ q: 0, r: 0, dq: 0, dr: -1 }],
                    types: ["wood"],
                  },
                },
              ],
            },
          ],
        },
        3,
      ),
    ).toThrow("est sur une case tirée au sort");
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

  it("lays the sea of a hidden zone face down too", () => {
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
              terrainCounts: { sea: 1, forest: 1 },
              numberTokens: [4],
            },
            {
              name: "Brume",
              cells: strip(3, 4),
              terrainCounts: { sea: 2, forest: 1 },
              numberTokens: [9],
              hidden: true,
            },
          ],
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 5);

    // The fog would be mapped for free otherwise: an open space is water, a
    // face-down one is land. Only the fog's two sea tiles are turned over —
    // the known zone's one and the middle row's two fixed spaces stay open.
    expect(board.sea.filter(s => s.hidden)).toHaveLength(2);
    expect(board.sea.filter(s => !s.hidden)).toHaveLength(3);
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
    expect(board.sea.map(cellKey)).toEqual([...FIXED_SEA, "2,2"]);
  });

  it("keeps its own sea whatever an older map painted there", () => {
    // Both ends of the middle row claimed the way a map authored before they
    // were the board's own would: one in a zone, one as a fixed tile.
    const [near, far] = fixedSeaCells(DEFAULT_WIDTH).map(cell => ({ ...cell }));
    const spec: ScenarioSpec = {
      name: "Ancienne carte",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Île",
              cells: [near, { q: 0, r: 0 }, { q: 1, r: 0 }],
              terrainCounts: { forest: 3 },
              numberTokens: [4, 5, 6],
            },
          ],
          statics: [{ cell: far, terrain: "mountains", number: 9 }],
        },
      ],
    };
    const { board } = generateSpecBoard(spec, 3, 7);

    expect(board.hexes.map(cellKey)).toEqual(["0,0", "1,0"]);
    expect(board.sea.map(cellKey)).toEqual(FIXED_SEA);
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

  it("keeps the reds off a gold river anyone can see", () => {
    // Five spaces in a blob, two of the five tokens red: wherever the gold river
    // lands there is always a pair of non-adjacent spaces left to take them, so
    // the only thing that can push a red onto the gold is a missing rule.
    const spec: ScenarioSpec = {
      name: "Or",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Île",
              cells: [
                { q: 0, r: 0 },
                { q: 1, r: 0 },
                { q: 2, r: 0 },
                { q: 0, r: 1 },
                { q: 1, r: 1 },
              ],
              terrainCounts: { gold: 1, forest: 2, pasture: 2 },
              numberTokens: [6, 8, 5, 4, 3],
            },
          ],
        },
      ],
    };

    for (let seed = 0; seed < 10; seed++) {
      const { board } = generateSpecBoard(spec, 3, seed);
      const gold = board.hexes.find(h => h.terrain === "gold");

      expect(gold?.number).not.toBe(6);
      expect(gold?.number).not.toBe(8);
    }
  });

  it("lets a gold river hidden in the fog take a red", () => {
    // The fog holds one gold river and one 6, so that 6 has nowhere else to go.
    // The island next to it has one reading and one only: its two 5s can't touch,
    // so they take the ends and the 4 the middle. Reach the rule into the fog and
    // there is no legal board at all — everything falls back to a raw shuffle and
    // the island's tokens wander.
    const spec: ScenarioSpec = {
      name: "Brume dorée",
      targetScore: 10,
      boards: [
        {
          players: [3],
          zones: [
            {
              name: "Île",
              cells: strip(3),
              terrainCounts: { forest: 3 },
              numberTokens: [5, 5, 4],
            },
            {
              name: "Brume",
              cells: [{ q: 0, r: 1 }],
              terrainCounts: { gold: 1 },
              numberTokens: [6],
              hidden: true,
            },
          ],
        },
      ],
    };

    for (let seed = 0; seed < 10; seed++) {
      const { board } = generateSpecBoard(spec, 3, seed);
      const at = (q: number, r: number) =>
        board.hexes.find(h => h.q === q && h.r === r)?.number;

      expect([at(0, 0), at(1, 0), at(2, 0), at(0, 1)]).toEqual([5, 4, 5, 6]);
    }
  });
});

describe("zone balance", () => {
  /** The archipelago, with a margin of its own asked for on its only zone. */
  const HELD: ScenarioSpec = {
    ...ARCHIPEL,
    boards: [
      {
        ...ARCHIPEL_BOARD,
        zones: [{ ...ARCHIPEL_BOARD.zones[0], balanceTolerance: 25 }],
      },
    ],
  };

  it("hands a zone's margin to its bag, under the scenario's setting", () => {
    const [held] = generateSpecBoard(HELD, 3, 7, { balanceZones: true }).variant
      .pools;

    expect(held.balanceTolerance).toBeCloseTo(0.25);
    expect(held.label).toBe("Archipel");
  });

  it("leaves the margin in the scenario while the setting is off", () => {
    const [loose] = generateSpecBoard(HELD, 3, 7).variant.pools;

    expect(loose).not.toHaveProperty("balanceTolerance");
    expect(HELD.boards[0].zones[0].balanceTolerance).toBe(25);
  });

  it("holds no zone that asks for no margin of its own", () => {
    const [free] = generateSpecBoard(ARCHIPEL, 3, 7, {
      balanceZones: true,
    }).variant.pools;

    expect(free).not.toHaveProperty("balanceTolerance");
  });
});
