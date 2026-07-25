import { describe, expect, it } from "vitest";

import {
  addBoard,
  addZone,
  canvasGrid,
  canvasLength,
  cellOwner,
  duplicateBoard,
  emptyScenario,
  eraseCell,
  MAX_LENGTH,
  MIN_LENGTH,
  paintCell,
  portTypeCounts,
  removeBoard,
  removeZone,
  renameZone,
  setBoardPlayers,
  setPortTypeCount,
  setScenarioName,
  setStaticTile,
  setTargetScore,
  setTerrainCount,
  setTokenCount,
  setZoneHidden,
  setZoneIslands,
  togglePortSlot,
  tokenCounts,
  zoneOfPortSlot,
} from "./scenario-draft";
import { BOARD_ROWS, type ScenarioSpec } from "./scenario-spec";

/** A scenario with two spaces painted into its only zone. */
function painted(): ScenarioSpec {
  const start = emptyScenario();

  return paintCell(paintCell(start, 0, 0, { q: 0, r: 0 }), 0, 0, {
    q: 1,
    r: 0,
  });
}

/** The one zone of the one board of a scenario. */
function zone(spec: ScenarioSpec, index = 0) {
  return spec.boards[0].zones[index];
}

describe("canvasGrid", () => {
  it("covers the seven rows, each as long as asked", () => {
    const cells = canvasGrid(5);

    expect(cells).toHaveLength(BOARD_ROWS * 5);
    expect(new Set(cells.map(c => c.r)).size).toBe(BOARD_ROWS);
  });

  it("shifts each pair of rows half a space, so the frame stays square", () => {
    const cells = canvasGrid(3);
    const firstOf = (r: number) => cells.find(c => c.r === r)?.q;

    expect(firstOf(0)).toBe(0);
    expect(firstOf(1)).toBe(0);
    expect(firstOf(2)).toBe(-1);
    expect(firstOf(6)).toBe(-3);
  });
});

describe("canvasLength", () => {
  it("is the smallest canvas on a board with nothing painted", () => {
    expect(canvasLength(emptyScenario().boards[0])).toBe(MIN_LENGTH);
  });

  it("grows to hold the space painted furthest out", () => {
    const wide = paintCell(emptyScenario(), 0, 0, { q: 6, r: 2 });

    expect(canvasLength(wide.boards[0])).toBe(8);
  });

  it("counts a static tile like any other space", () => {
    const spec = setStaticTile(emptyScenario(), 0, { q: 7, r: 0 }, "mountains");

    expect(canvasLength(spec.boards[0])).toBe(8);
  });

  it("never grows past the widest canvas the editor draws", () => {
    const huge = paintCell(emptyScenario(), 0, 0, { q: 99, r: 0 });

    expect(canvasLength(huge.boards[0])).toBe(MAX_LENGTH);
  });
});

describe("cellOwner", () => {
  it("names the zone holding a space", () => {
    const spec = addZone(painted(), 0);
    const two = paintCell(spec, 0, 1, { q: 2, r: 0 });

    expect(cellOwner(two.boards[0], { q: 0, r: 0 })).toEqual({
      kind: "zone",
      zone: 0,
    });
    expect(cellOwner(two.boards[0], { q: 2, r: 0 })).toEqual({
      kind: "zone",
      zone: 1,
    });
  });

  it("hands back the static tile sitting on a space", () => {
    const spec = setStaticTile(
      emptyScenario(),
      0,
      { q: 3, r: 1 },
      "mountains",
      9,
    );
    const owner = cellOwner(spec.boards[0], { q: 3, r: 1 });

    expect(owner).toEqual({
      kind: "static",
      tile: { cell: { q: 3, r: 1 }, terrain: "mountains", number: 9 },
    });
  });

  it("holds nothing on a space nobody claimed", () => {
    expect(cellOwner(emptyScenario().boards[0], { q: 0, r: 0 })).toBeNull();
  });
});

describe("the scenario itself", () => {
  it("starts blank, with one board and one empty zone", () => {
    const spec = emptyScenario();

    expect(spec.name).toBe("");
    expect(spec.boards).toHaveLength(1);
    expect(spec.boards[0].players).toEqual([3]);
    expect(zone(spec).cells).toEqual([]);
  });

  it("takes a name and a score to reach", () => {
    const spec = setTargetScore(
      setScenarioName(emptyScenario(), "Les quatre îles"),
      13,
    );

    expect(spec.name).toBe("Les quatre îles");
    expect(spec.targetScore).toBe(13);
  });
});

describe("boards", () => {
  it("adds an empty board for another player count", () => {
    const spec = addBoard(painted(), [4]);

    expect(spec.boards).toHaveLength(2);
    expect(spec.boards[1].players).toEqual([4]);
    expect(spec.boards[1].zones[0].cells).toEqual([]);
  });

  it("copies a board over to another player count, spaces and bags", () => {
    const spec = duplicateBoard(
      setTerrainCount(painted(), 0, 0, "forest", 2),
      0,
      [5, 6],
    );

    expect(spec.boards[1].players).toEqual([5, 6]);
    expect(spec.boards[1].zones[0].cells).toHaveLength(2);
    expect(spec.boards[1].zones[0].terrainCounts).toEqual({ forest: 2 });
  });

  it("copies deeply, so painting the copy leaves the original alone", () => {
    const spec = duplicateBoard(painted(), 0, [4]);
    const changed = paintCell(spec, 1, 0, { q: 5, r: 5 });

    expect(changed.boards[1].zones[0].cells).toHaveLength(3);
    expect(changed.boards[0].zones[0].cells).toHaveLength(2);
  });

  it("changes which player counts a board serves, and drops one", () => {
    const two = setBoardPlayers(addBoard(painted(), [4]), 1, [4, 5]);

    expect(two.boards[1].players).toEqual([4, 5]);
    expect(removeBoard(two, 0).boards).toHaveLength(1);
  });
});

describe("zones", () => {
  it("adds zones, numbered after the ones already there", () => {
    const spec = addZone(addZone(emptyScenario(), 0), 0);

    expect(spec.boards[0].zones.map(z => z.name)).toEqual([
      "Zone 1",
      "Zone 2",
      "Zone 3",
    ]);
  });

  it("takes the name it is given", () => {
    const spec = renameZone(addZone(emptyScenario(), 0, "Mer"), 0, 0, "Île");

    expect(spec.boards[0].zones.map(z => z.name)).toEqual(["Île", "Mer"]);
  });

  it("removes a zone", () => {
    const left = removeZone(addZone(emptyScenario(), 0), 0, 0);

    expect(left.boards[0].zones.map(z => z.name)).toEqual(["Zone 2"]);
  });
});

describe("painting", () => {
  it("paints a space into a zone", () => {
    expect(zone(painted()).cells).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ]);
  });

  it("takes a space from the zone that held it", () => {
    const spec = paintCell(addZone(painted(), 0), 0, 1, { q: 0, r: 0 });

    expect(zone(spec, 0).cells).toEqual([{ q: 1, r: 0 }]);
    expect(zone(spec, 1).cells).toEqual([{ q: 0, r: 0 }]);
  });

  it("unpins the harbours of a space it takes away", () => {
    const pinned = togglePortSlot(painted(), 0, 0, {
      q: 0,
      r: 0,
      dq: 0,
      dr: -1,
    });
    const erased = eraseCell(pinned, 0, { q: 0, r: 0 });

    expect(zone(erased).ports?.slots).toEqual([]);
    expect(zone(erased).cells).toEqual([{ q: 1, r: 0 }]);
  });

  it("leaves a zone with no harbour bag alone when erasing", () => {
    const erased = eraseCell(painted(), 0, { q: 0, r: 0 });

    expect(zone(erased).ports).toBeUndefined();
  });

  it("erases a static tile like any other space", () => {
    const spec = setStaticTile(emptyScenario(), 0, { q: 2, r: 2 }, "sea");
    const erased = eraseCell(spec, 0, { q: 2, r: 2 });

    expect(erased.boards[0].statics).toEqual([]);
  });
});

describe("bags", () => {
  it("declares how many tiles of a terrain a zone holds", () => {
    const spec = setTerrainCount(painted(), 0, 0, "forest", 2);

    expect(zone(spec).terrainCounts).toEqual({ forest: 2 });
  });

  it("clears a terrain brought back down to nothing", () => {
    const spec = setTerrainCount(
      setTerrainCount(painted(), 0, 0, "forest", 2),
      0,
      0,
      "forest",
      0,
    );

    expect(zone(spec).terrainCounts).toEqual({});
  });

  it("counts the tokens and the harbours of a bag", () => {
    expect(tokenCounts([4, 4, 5])).toEqual(
      new Map([
        [4, 2],
        [5, 1],
      ]),
    );
    expect(portTypeCounts(["wood", "wood"])).toEqual(new Map([["wood", 2]]));
  });

  it("keeps the token bag in order, whatever order it was filled in", () => {
    const spec = setTokenCount(
      setTokenCount(setTokenCount(painted(), 0, 0, 10, 1), 0, 0, 4, 2),
      0,
      0,
      6,
      1,
    );

    expect(zone(spec).numberTokens).toEqual([4, 4, 6, 10]);
  });

  it("empties a token out of the bag, and never goes below empty", () => {
    const filled = setTokenCount(painted(), 0, 0, 8, 2);

    expect(zone(setTokenCount(filled, 0, 0, 8, 0)).numberTokens).toEqual([]);
    expect(zone(setTokenCount(filled, 0, 0, 8, -3)).numberTokens).toEqual([]);
  });

  it("fills the harbour bag by type", () => {
    const spec = setPortTypeCount(
      setPortTypeCount(painted(), 0, 0, "generic", 2),
      0,
      0,
      "wood",
      1,
    );

    expect(zone(spec).ports?.types).toEqual(["generic", "generic", "wood"]);
    expect(
      zone(setPortTypeCount(spec, 0, 0, "generic", 0)).ports?.types,
    ).toEqual(["wood"]);
  });
});

describe("zone options", () => {
  it("lays a zone face down and back up", () => {
    const hidden = setZoneHidden(painted(), 0, 0, true);

    expect(zone(hidden).hidden).toBe(true);
    expect(zone(setZoneHidden(hidden, 0, 0, false))).not.toHaveProperty(
      "hidden",
    );
  });

  it("asks a zone's land to form islands, then stops asking", () => {
    const grown = setZoneIslands(painted(), 0, 0, [2, 3]);

    expect(zone(grown).islands).toEqual([2, 3]);
    expect(zone(setZoneIslands(grown, 0, 0, null))).not.toHaveProperty(
      "islands",
    );
  });
});

describe("harbours", () => {
  const slot = { q: 0, r: 0, dq: 0, dr: -1 } as const;

  it("pins a harbour on an edge, and unpins the same one", () => {
    const pinned = togglePortSlot(painted(), 0, 0, slot);

    expect(zone(pinned).ports?.slots).toEqual([slot]);
    expect(zone(togglePortSlot(pinned, 0, 0, slot)).ports?.slots).toEqual([]);
  });

  it("tells one edge of a space from another", () => {
    const other = { q: 0, r: 0, dq: 1, dr: -1 } as const;
    const both = togglePortSlot(
      togglePortSlot(painted(), 0, 0, slot),
      0,
      0,
      other,
    );

    expect(both.boards[0].zones[0].ports?.slots).toEqual([slot, other]);
  });

  it("leaves the harbours already in the bag where they are", () => {
    const spec = setPortTypeCount(painted(), 0, 0, "wood", 1);

    expect(zone(togglePortSlot(spec, 0, 0, slot)).ports?.types).toEqual([
      "wood",
    ]);
  });

  it("names the zone a pinned harbour belongs to", () => {
    const spec = togglePortSlot(addZone(painted(), 0), 0, 1, slot);

    expect(zoneOfPortSlot(spec.boards[0], slot)).toBe(1);
  });

  it("names no zone for an edge nothing is pinned on", () => {
    expect(zoneOfPortSlot(painted().boards[0], slot)).toBeNull();
  });
});

describe("static tiles", () => {
  it("fixes a terrain, with or without a token", () => {
    const spec = setStaticTile(
      setStaticTile(emptyScenario(), 0, { q: 0, r: 1 }, "sea"),
      0,
      { q: 1, r: 1 },
      "mountains",
      9,
    );

    expect(spec.boards[0].statics).toEqual([
      { cell: { q: 0, r: 1 }, terrain: "sea" },
      { cell: { q: 1, r: 1 }, terrain: "mountains", number: 9 },
    ]);
  });

  it("takes the space out of the zone that held it", () => {
    const spec = setStaticTile(painted(), 0, { q: 0, r: 0 }, "desert");

    expect(zone(spec).cells).toEqual([{ q: 1, r: 0 }]);
    expect(spec.boards[0].statics).toHaveLength(1);
  });

  it("replaces the static tile already on the space", () => {
    const spec = setStaticTile(
      setStaticTile(emptyScenario(), 0, { q: 0, r: 1 }, "sea"),
      0,
      { q: 0, r: 1 },
      "desert",
    );

    expect(spec.boards[0].statics).toEqual([
      { cell: { q: 0, r: 1 }, terrain: "desert" },
    ]);
  });
});
