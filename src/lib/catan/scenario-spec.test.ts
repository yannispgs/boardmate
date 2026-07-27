import { describe, expect, it } from "vitest";

import { EXTENSION_VARIANT } from "./board";
import {
  bagLandCounts,
  bagTileCount,
  boardOutline,
  boardTotals,
  cellKey,
  DEFAULT_WIDTH,
  fixedSeaCells,
  isFixedSea,
  isValidToken,
  MIN_WIDTH,
  portEdges,
  type ScenarioBoardSpec,
  type ScenarioSpec,
  type ScenarioZone,
  type SpecIssue,
  specIssueText,
  tokenBearingCount,
  validateScenarioDraft,
  validateScenarioSpec,
} from "./scenario-spec";

/** A well-formed zone: three spaces, three tiles, two tokens (one desert). */
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

/** A scenario holding a single board made of the given zones. */
function spec(board: Partial<ScenarioBoardSpec> = {}): ScenarioSpec {
  return {
    name: "Test",
    targetScore: 12,
    boards: [{ players: [3], zones: [zone()], ...board }],
  };
}

/** The issue kinds `spec` raises, in order. */
function kinds(scenario: ScenarioSpec): string[] {
  return validateScenarioSpec(scenario).map(issue => issue.kind);
}

describe("isValidToken", () => {
  it("accepts 2 to 12 but never the 7", () => {
    expect([2, 6, 8, 12].every(isValidToken)).toBe(true);
    expect(isValidToken(7)).toBe(false);
  });

  it("rejects anything outside the range or not a whole number", () => {
    expect(isValidToken(1)).toBe(false);
    expect(isValidToken(13)).toBe(false);
    expect(isValidToken(4.5)).toBe(false);
  });
});

describe("bagTileCount", () => {
  it("adds up the tiles of a bag, the sea included", () => {
    expect(bagTileCount({ forest: 2, desert: 1, sea: 3 })).toBe(6);
    expect(bagTileCount({})).toBe(0);
  });

  it("ignores a terrain the author has cleared", () => {
    expect(bagTileCount({ forest: 2, pasture: undefined })).toBe(2);
  });
});

describe("tokenBearingCount", () => {
  it("counts every tile but the deserts and the sea", () => {
    expect(tokenBearingCount({ forest: 2, desert: 1, sea: 3 })).toBe(2);
  });

  it("counts the gold river, which carries a token like any other tile", () => {
    expect(tokenBearingCount({ gold: 2, mountains: 1 })).toBe(3);
  });
});

describe("bagLandCounts", () => {
  it("drops the sea and fills in the terrains the bag doesn't hold", () => {
    expect(bagLandCounts({ forest: 2, sea: 3 })).toEqual({
      forest: 2,
      pasture: 0,
      fields: 0,
      hills: 0,
      mountains: 0,
      gold: 0,
      desert: 0,
    });
  });

  it("is all zeroes with no bag at all", () => {
    expect(bagTileCount(bagLandCounts())).toBe(0);
  });
});

describe("boardOutline", () => {
  it("is the 5–6 player board at its narrowest", () => {
    // The extension board was laid out long before this format existed, so it
    // pins the outline's arithmetic against something independent: at width 3
    // the seven rows are 3-4-5-6-5-4-3, that board exactly, down to the offsets.
    const extension = EXTENSION_VARIANT.cells
      .map(cell => cellKey({ q: cell.q, r: cell.r + 3 }))
      .sort();

    expect(boardOutline(MIN_WIDTH).map(cellKey).sort()).toEqual(extension);
  });
});

describe("portEdges", () => {
  /** The three spaces of `zone()`, in a row, with the sea all around them. */
  const board: ScenarioBoardSpec = { players: [3], zones: [zone()] };

  it("offers the coastal edges of a space, and only those", () => {
    // (1,0) sits between its two neighbours: four of its six edges face the
    // open sea, the two along the row face land.
    expect(portEdges(board, { q: 1, r: 0 })).toEqual([
      { q: 1, r: 0, dq: 1, dr: -1 },
      { q: 1, r: 0, dq: 0, dr: -1 },
      { q: 1, r: 0, dq: -1, dr: 1 },
      { q: 1, r: 0, dq: 0, dr: 1 },
    ]);
  });

  it("offers nothing on a space the draw could turn into sea", () => {
    const drawn = { ...board, zones: [zone({ terrainCounts: { sea: 1 } })] };

    expect(portEdges(drawn, { q: 1, r: 0 })).toEqual([]);
  });

  it("offers nothing on a space of a zone laid face down", () => {
    // Nothing but land in the bag, so the space is certain — but nobody knows
    // that until the tile is turned over, and no coast is printed on fog.
    const fog = { ...board, zones: [zone({ hidden: true })] };

    expect(portEdges(fog, { q: 1, r: 0 })).toEqual([]);
  });

  it("offers nothing on a space the map never painted", () => {
    expect(portEdges(board, { q: 5, r: 5 })).toEqual([]);
  });

  it("drops the edges touching a harbour already pinned", () => {
    // The harbour on (0,0) runs onto (1,-1) and ends at the corner the two
    // spaces share, which is where the north-west edge of (1,0) starts.
    const pinned = {
      ...board,
      zones: [
        zone({
          ports: { slots: [{ q: 0, r: 0, dq: 1, dr: -1 }], types: ["wood"] },
        }),
      ],
    };

    expect(portEdges(pinned, { q: 1, r: 0 })).toEqual([
      { q: 1, r: 0, dq: 1, dr: -1 },
      { q: 1, r: 0, dq: -1, dr: 1 },
      { q: 1, r: 0, dq: 0, dr: 1 },
    ]);
  });
});

describe("boardTotals", () => {
  it("sums the zones and the static tiles of a board", () => {
    const totals = boardTotals({
      players: [3],
      zones: [
        zone({ terrainCounts: { forest: 2, sea: 1 }, numberTokens: [4, 5] }),
        zone({
          name: "Récif",
          cells: [{ q: 0, r: 1 }],
          terrainCounts: { hills: 1 },
          numberTokens: [6],
          ports: { types: ["wood", "ore"] },
        }),
      ],
      statics: [
        { cell: { q: 5, r: 5 }, terrain: "mountains", number: 9 },
        { cell: { q: 6, r: 5 }, terrain: "desert" },
        { cell: { q: 7, r: 5 }, terrain: "sea" },
      ],
    });

    expect(totals.land).toBe(5);
    expect(totals.sea).toBe(2);
    expect(totals.ports).toBe(2);
    expect(totals.numberTokens).toEqual([4, 5, 6, 9]);
    expect(totals.terrainCounts).toMatchObject({
      forest: 2,
      hills: 1,
      mountains: 1,
      desert: 1,
    });
  });
});

describe("validateScenarioSpec", () => {
  it("passes a scenario that adds up", () => {
    expect(validateScenarioSpec(spec())).toEqual([]);
  });

  it("flags a scenario with no board", () => {
    expect(kinds({ name: "Vide", targetScore: 10, boards: [] })).toEqual([
      "no-boards",
    ]);
  });

  it("flags a board used for nobody", () => {
    expect(kinds(spec({ players: [] }))).toEqual(["no-players"]);
  });

  it("flags a player count served by two boards", () => {
    const two = spec();

    // Each board is its own map, so reusing the same spaces is fine — only
    // serving the same player count twice is not.
    two.boards.push({ ...two.boards[0] });

    expect(kinds(two)).toEqual(["duplicate-players"]);
  });

  it("flags a zone with no space", () => {
    expect(
      kinds(spec({ zones: [zone({ cells: [], terrainCounts: {} })] })),
    ).toEqual(["empty-zone", "token-count"]);
  });

  it("flags a space outside the board's outline", () => {
    expect(
      kinds(
        spec({
          zones: [
            zone({
              cells: [
                { q: 0, r: -1 },
                { q: 1, r: 7 },
                { q: 2, r: 0 },
              ],
            }),
          ],
        }),
      ),
    ).toEqual(["off-board", "off-board"]);
  });

  it("lets a wider board hold a space a narrower one cannot", () => {
    const cells = [
      { q: 6, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ];

    expect(kinds(spec({ zones: [zone({ cells })] }))).toEqual(["off-board"]);
    expect(kinds(spec({ width: 7, zones: [zone({ cells })] }))).toEqual([]);
  });

  it("flags a space claimed twice, whatever claims it", () => {
    expect(
      kinds(
        spec({
          statics: [{ cell: { q: 0, r: 0 }, terrain: "mountains", number: 9 }],
        }),
      ),
    ).toEqual(["overlap"]);
  });

  it("flags a bag that holds the wrong number of tiles", () => {
    expect(
      kinds(spec({ zones: [zone({ terrainCounts: { forest: 2 } })] })),
    ).toEqual(["tile-count"]);
  });

  it("flags a bag that holds the wrong number of tokens", () => {
    expect(kinds(spec({ zones: [zone({ numberTokens: [4] })] }))).toEqual([
      "token-count",
    ]);
  });

  it("flags an impossible token in a bag", () => {
    expect(kinds(spec({ zones: [zone({ numberTokens: [4, 7] })] }))).toEqual([
      "bad-token",
    ]);
  });

  it("flags an impossible token on a static tile", () => {
    expect(
      kinds(
        spec({
          statics: [{ cell: { q: 0, r: 1 }, terrain: "mountains", number: 13 }],
        }),
      ),
    ).toEqual(["bad-token"]);
  });

  it("flags a static tile of a rolled terrain left without a token", () => {
    expect(
      kinds(
        spec({ statics: [{ cell: { q: 0, r: 1 }, terrain: "mountains" }] }),
      ),
    ).toEqual(["static-no-token"]);
  });

  it("accepts the sea and the desert left without a token", () => {
    expect(
      validateScenarioSpec(
        spec({
          statics: [
            { cell: { q: 0, r: 1 }, terrain: "sea" },
            { cell: { q: 1, r: 1 }, terrain: "desert" },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("flags a token on a static tile that can't carry one", () => {
    expect(
      kinds(
        spec({
          statics: [
            { cell: { q: 0, r: 1 }, terrain: "sea", number: 9 },
            { cell: { q: 1, r: 1 }, terrain: "desert", number: 9 },
          ],
        }),
      ),
    ).toEqual(["static-token", "static-token"]);
  });

  it("flags a red number pinned on a gold river", () => {
    expect(
      kinds(
        spec({
          statics: [
            { cell: { q: 0, r: 1 }, terrain: "gold", number: 6 },
            { cell: { q: 1, r: 1 }, terrain: "gold", number: 8 },
          ],
        }),
      ),
    ).toEqual(["static-gold-red", "static-gold-red"]);
  });

  it("accepts a gold river pinned with anything but a red", () => {
    expect(
      validateScenarioSpec(
        spec({
          statics: [{ cell: { q: 0, r: 1 }, terrain: "gold", number: 9 }],
        }),
      ),
    ).toEqual([]);
  });

  it("flags a bag with nowhere left to put its reds but a gold river", () => {
    // Three tiles carry a token, two of them gold — so a single non-gold tile
    // for two reds. One of the 6 and the 8 has to land on a gold river.
    expect(
      kinds(
        spec({
          zones: [
            zone({
              terrainCounts: { forest: 1, gold: 2 },
              numberTokens: [6, 8, 5],
            }),
          ],
        }),
      ),
    ).toEqual(["forced-gold-red"]);
  });

  it("accepts reds a zone can keep off its gold rivers", () => {
    expect(
      validateScenarioSpec(
        spec({
          zones: [
            zone({
              terrainCounts: { forest: 2, gold: 1 },
              numberTokens: [6, 8, 5],
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("lets a face-down zone hold reds it could not place face up", () => {
    expect(
      validateScenarioSpec(
        spec({
          zones: [
            zone({
              hidden: true,
              terrainCounts: { forest: 1, gold: 2 },
              numberTokens: [6, 8, 5],
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("accepts a harbour bag with no pinned slot", () => {
    expect(
      validateScenarioSpec(
        spec({ zones: [zone({ ports: { types: ["wood"] } })] }),
      ),
    ).toEqual([]);
  });

  it("refuses any harbour at all in a zone laid face down", () => {
    expect(
      kinds(
        spec({
          zones: [zone({ hidden: true, ports: { types: ["wood"] } })],
        }),
      ),
    ).toEqual(["port-hidden"]);
  });

  it("flags a harbour bag with more slots than harbours", () => {
    expect(
      kinds(
        spec({
          zones: [
            zone({
              ports: {
                slots: [
                  { q: 0, r: 0, dq: 0, dr: -1 },
                  { q: 1, r: 0, dq: 0, dr: -1 },
                ],
                types: ["wood"],
              },
            }),
          ],
        }),
      ),
    ).toEqual(["port-count"]);
  });

  it("refuses a harbour pinned where the sea is drawn", () => {
    // Its space could come up as sea: a harbour needs land in every draw.
    expect(
      kinds(
        spec({
          zones: [
            zone({
              terrainCounts: { forest: 2, sea: 1 },
              numberTokens: [4, 5],
              ports: {
                slots: [{ q: 0, r: 0, dq: 0, dr: -1 }],
                types: ["wood"],
              },
            }),
          ],
        }),
      ),
    ).toEqual(["port-on-drawn"]);
  });

  it("refuses a harbour pinned on a zone that is nothing but sea", () => {
    expect(
      kinds(
        spec({
          zones: [
            zone({
              terrainCounts: { sea: 3 },
              numberTokens: [],
              ports: {
                slots: [{ q: 0, r: 0, dq: 0, dr: -1 }],
                types: ["wood"],
              },
            }),
          ],
        }),
      ),
    ).toEqual(["port-on-water"]);
  });

  it("refuses a harbour whose edge faces land rather than water", () => {
    // (1,0) is a space of the island too, so the edge between them is inland.
    expect(
      kinds(
        spec({
          zones: [
            zone({
              ports: {
                slots: [{ q: 0, r: 0, dq: 1, dr: 0 }],
                types: ["wood"],
              },
            }),
          ],
        }),
      ),
    ).toEqual(["port-inland"]);
  });

  it("refuses a harbour whose edge faces a space left to the draw", () => {
    expect(
      kinds(
        spec({
          zones: [
            zone({
              cells: [{ q: 0, r: 0 }],
              terrainCounts: { forest: 1 },
              numberTokens: [4],
              ports: {
                slots: [{ q: 0, r: 0, dq: 1, dr: 0 }],
                types: ["wood"],
              },
            }),
            zone({
              name: "Large",
              cells: [
                { q: 1, r: 0 },
                { q: 2, r: 0 },
              ],
              terrainCounts: { forest: 1, sea: 1 },
              numberTokens: [5],
            }),
          ],
        }),
      ),
    ).toEqual(["port-inland"]);
  });

  it("takes two harbours on one space when a corner stays free", () => {
    // A published Marins map prints two on the same tile: what two harbours ask
    // for is a free corner between them, not a tile each.
    expect(
      kinds(
        spec({
          zones: [
            zone({
              ports: {
                slots: [
                  { q: 0, r: 0, dq: 0, dr: -1 },
                  { q: 0, r: 0, dq: 0, dr: 1 },
                ],
                types: ["wood", "ore"],
              },
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("refuses two harbours meeting on the edges of one space", () => {
    // Both edges end at the corner (0,0) shares with (0,-1) and (1,-1): two
    // edges of one tile meet exactly the way two tiles' do. One is held in the
    // zone's bag and the other in the board's own — they are judged together.
    expect(
      kinds(
        spec({
          zones: [
            zone({
              ports: {
                slots: [{ q: 0, r: 0, dq: 0, dr: -1 }],
                types: ["wood"],
              },
            }),
          ],
          ports: {
            slots: [{ q: 0, r: 0, dq: 1, dr: -1 }],
            types: ["generic"],
          },
        }),
      ),
    ).toEqual(["port-touching"]);
  });

  it("refuses two harbours meeting at a corner", () => {
    // Both edges run onto (1,-1) and end at the corner (0,0) and (1,0) share:
    // a printed board always leaves a free corner between two harbours.
    expect(
      kinds(
        spec({
          zones: [
            zone({
              ports: {
                slots: [
                  { q: 0, r: 0, dq: 1, dr: -1 },
                  { q: 1, r: 0, dq: 0, dr: -1 },
                ],
                types: ["wood", "ore"],
              },
            }),
          ],
        }),
      ),
    ).toEqual(["port-touching"]);
  });

  it("accepts a harbour on a static tile, in the board's own bag", () => {
    expect(
      validateScenarioSpec(
        spec({
          statics: [{ cell: { q: 0, r: 1 }, terrain: "hills", number: 6 }],
          ports: {
            slots: [{ q: 0, r: 1, dq: 0, dr: 1 }],
            types: ["generic"],
          },
        }),
      ),
    ).toEqual([]);
  });

  it("makes the board's own bag pin every one of its harbours", () => {
    expect(
      kinds(
        spec({
          statics: [{ cell: { q: 0, r: 1 }, terrain: "hills", number: 6 }],
          ports: { types: ["generic"] },
        }),
      ),
    ).toEqual(["board-port-count"]);
  });

  it("refuses a harbour pinned on a space nothing holds", () => {
    // Unpainted, so open sea — there is no coast there to pin anything on.
    expect(
      kinds(
        spec({
          zones: [
            zone({
              ports: {
                slots: [{ q: 9, r: 1, dq: 0, dr: -1 }],
                types: ["wood"],
              },
            }),
          ],
        }),
      ),
    ).toEqual(["port-on-water"]);
  });
});

describe("fixedSeaCells", () => {
  it("fixes the two ends of the widest row to the open sea", () => {
    expect(fixedSeaCells(DEFAULT_WIDTH)).toEqual([
      { q: -3, r: 3 },
      { q: 5, r: 3 },
    ]);
  });

  it("carries the far one out as the board widens", () => {
    expect(fixedSeaCells(DEFAULT_WIDTH + 1)).toEqual([
      { q: -3, r: 3 },
      { q: 6, r: 3 },
    ]);
  });

  it("knows a space the board fixes from one the author paints", () => {
    expect(isFixedSea(DEFAULT_WIDTH, { q: 5, r: 3 })).toBe(true);
    expect(isFixedSea(DEFAULT_WIDTH, { q: -3, r: 3 })).toBe(true);

    expect(isFixedSea(DEFAULT_WIDTH, { q: 4, r: 3 })).toBe(false);
    expect(isFixedSea(DEFAULT_WIDTH, { q: 5, r: 2 })).toBe(false);
  });

  it("holds the open sea whatever a zone claims of it", () => {
    // A bag of nothing but land over the whole row, the two ends included: they
    // are still the sea the board fixes, so the tile beside one has a coast.
    const board: ScenarioBoardSpec = {
      players: [3],
      width: DEFAULT_WIDTH,
      zones: [
        {
          name: "Ligne",
          cells: [
            { q: 4, r: 3 },
            { q: 5, r: 3 },
          ],
          terrainCounts: { forest: 2 },
          numberTokens: [4, 5],
        },
      ],
    };

    expect(portEdges(board, { q: 5, r: 3 })).toEqual([]);
    expect(portEdges(board, { q: 4, r: 3 })).toContainEqual({
      q: 4,
      r: 3,
      dq: 1,
      dr: 0,
    });
  });
});

describe("validateScenarioDraft", () => {
  it("counts the spaces of the map the author has left to nobody", () => {
    // `spec()` paints three spaces of a full board: the rest is still blank,
    // which the draw would take as it is but no author should save. The two the
    // board fixes to the open sea are nobody's to paint, so they are not owed.
    expect(validateScenarioDraft(spec())).toEqual([
      {
        kind: "unassigned",
        board: 0,
        count:
          boardOutline(DEFAULT_WIDTH).length -
          3 -
          fixedSeaCells(DEFAULT_WIDTH).length,
      },
    ]);
  });

  it("accepts a map drawn to its edges with no zone at all", () => {
    // Every space a fixed tile — bar the two the board holds itself, which the
    // author is owed nothing for. A scenario that draws nothing at random is a
    // scenario all the same, and it needs no zone to be saved.
    expect(
      validateScenarioDraft(
        spec({
          zones: [],
          statics: boardOutline(DEFAULT_WIDTH)
            .filter(cell => !isFixedSea(DEFAULT_WIDTH, cell))
            .map(cell => ({ cell, terrain: "sea" as const })),
        }),
      ),
    ).toEqual([]);
  });
});

describe("cellKey", () => {
  it("keys a space by its coordinates", () => {
    expect(cellKey({ q: -1, r: 2 })).toBe("-1,2");
  });
});

describe("specIssueText", () => {
  const shared = { board: 0, zone: 0, name: "Île" };
  const cell = { q: 1, r: 2 };
  const issues: SpecIssue[] = [
    { kind: "no-boards" },
    { kind: "no-players", board: 0 },
    { kind: "duplicate-players", board: 0, players: 4 },
    { kind: "empty-zone", ...shared },
    { kind: "off-board", board: 0, cell },
    { kind: "overlap", board: 0, cell },
    { kind: "tile-count", ...shared, tiles: 2, cells: 3 },
    { kind: "token-count", ...shared, tokens: 1, needed: 2 },
    { kind: "bad-token", board: 0, where: "Île", token: 7 },
    { kind: "static-token", board: 0, cell },
    { kind: "port-count", ...shared, types: 1, slots: 2 },
    { kind: "board-port-count", board: 0, types: 2, slots: 1 },
    { kind: "port-on-water", board: 0, cell },
    { kind: "port-on-drawn", board: 0, cell },
    { kind: "port-inland", board: 0, cell, across: { q: 1, r: 1 } },
    { kind: "static-gold-red", board: 0, cell },
    { kind: "forced-gold-red", ...shared, reds: 2, others: 1 },
    { kind: "static-no-token", board: 0, cell },
    { kind: "port-touching", board: 0, cell, other: { q: 1, r: 1 } },
    { kind: "port-touching", board: 0, cell, other: cell },
    { kind: "unassigned", board: 0, count: 1 },
    { kind: "unassigned", board: 0, count: 12 },
    { kind: "port-hidden", ...shared },
  ];

  it("phrases every issue for the author, in French and without a blank", () => {
    for (const issue of issues) {
      expect(specIssueText(issue)).toMatch(/^\S.*\.$/);
    }
  });

  it("names the numbers that don't add up", () => {
    expect(specIssueText(issues[6])).toBe(
      "La zone « Île » compte 3 cases pour 2 tuiles déclarées.",
    );
    expect(specIssueText(issues[7])).toBe(
      "La zone « Île » déclare 1 jetons pour 2 tuiles qui en portent un.",
    );
    expect(specIssueText(issues[11])).toBe(
      "Les 2 ports hors zone demandent autant d'emplacements épinglés : il y en a 1.",
    );
  });
});
