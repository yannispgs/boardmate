import { describe, expect, it } from "vitest";

import {
  bagLandCounts,
  bagTileCount,
  boardTotals,
  cellKey,
  isValidToken,
  type ScenarioBoardSpec,
  type ScenarioSpec,
  type ScenarioZone,
  type SpecIssue,
  specIssueText,
  tokenBearingCount,
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

  it("flags a space outside the seven rows", () => {
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
    ).toEqual(["row-out-of-range", "row-out-of-range"]);
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

  it("accepts a static tile left without a token", () => {
    expect(
      validateScenarioSpec(
        spec({ statics: [{ cell: { q: 0, r: 1 }, terrain: "mountains" }] }),
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

  it("accepts a harbour bag with no pinned slot", () => {
    expect(
      validateScenarioSpec(
        spec({ zones: [zone({ ports: { types: ["wood"] } })] }),
      ),
    ).toEqual([]);
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

  it("accepts a harbour pinned on a zone whose sea is drawn", () => {
    // The scenario always fixes where a harbour sits; pinning one simply makes
    // that space land whatever the draw.
    expect(
      validateScenarioSpec(
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
    ).toEqual([]);
  });

  it("flags more coast pinned than the zone has land to give", () => {
    expect(
      kinds(
        spec({
          zones: [
            zone({
              terrainCounts: { forest: 1, sea: 2 },
              numberTokens: [4],
              ports: {
                slots: [
                  { q: 0, r: 0, dq: 0, dr: -1 },
                  { q: 1, r: 0, dq: 0, dr: -1 },
                ],
                types: ["wood", "ore"],
              },
            }),
          ],
        }),
      ),
    ).toEqual(["port-over-land"]);
  });

  it("counts two harbours on one space as one space of coast", () => {
    expect(
      validateScenarioSpec(
        spec({
          zones: [
            zone({
              terrainCounts: { forest: 1, sea: 2 },
              numberTokens: [4],
              ports: {
                slots: [
                  { q: 0, r: 0, dq: 0, dr: -1 },
                  { q: 0, r: 0, dq: 1, dr: -1 },
                ],
                types: ["wood", "ore"],
              },
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("flags a harbour pinned on a space the zone doesn't hold", () => {
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
    ).toEqual(["port-off-zone"]);
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
    { kind: "row-out-of-range", board: 0, cell },
    { kind: "overlap", board: 0, cell },
    { kind: "tile-count", ...shared, tiles: 2, cells: 3 },
    { kind: "token-count", ...shared, tokens: 1, needed: 2 },
    { kind: "bad-token", board: 0, where: "Île", token: 7 },
    { kind: "static-token", board: 0, cell },
    { kind: "port-count", ...shared, types: 1, slots: 2 },
    { kind: "port-over-land", ...shared, spaces: 2, land: 1 },
    { kind: "port-off-zone", ...shared, cell },
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
    expect(specIssueText(issues[12])).toBe(
      "Le port épinglé en 1,2 n'est pas dans la zone « Île ».",
    );
  });
});
