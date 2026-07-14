import { describe, expect, it } from "vitest";

import {
  axialToPixel,
  type CatanTerrain,
  clusterPenalty,
  generateCatanBoard,
  HEX_CELLS,
  HEX_NEIGHBOURS,
  hasMonoTriangle,
  isRedNumber,
  NUMBER_TOKENS,
  PORT_SLOTS,
  pipCount,
  TERRAIN_RESOURCE,
} from "./board";

describe("board geometry", () => {
  it("is the 3-4-5-4-3 hexagon of 19 cells", () => {
    expect(HEX_CELLS).toHaveLength(19);

    const perRow = new Map<number, number>();

    for (const c of HEX_CELLS) {
      perRow.set(c.r, (perRow.get(c.r) ?? 0) + 1);
    }

    expect([...perRow.values()]).toEqual([3, 4, 5, 4, 3]);
  });

  it("has symmetric adjacency and a 6-neighbour centre", () => {
    HEX_NEIGHBOURS.forEach((nbs, id) => {
      for (const nb of nbs) {
        expect(HEX_NEIGHBOURS[nb]).toContain(id);
      }
    });

    const centre = HEX_CELLS.find(c => c.q === 0 && c.r === 0);

    expect(centre).toBeDefined();
    expect(HEX_NEIGHBOURS[centre?.id ?? -1]).toHaveLength(6);
  });

  it("exposes nine harbour slots on off-board edges", () => {
    expect(PORT_SLOTS).toHaveLength(9);

    for (const slot of PORT_SLOTS) {
      const cell = HEX_CELLS[slot.hexId];
      const onBoard = HEX_CELLS.some(
        c => c.q === cell.q + slot.dq && c.r === cell.r + slot.dr,
      );

      expect(onBoard).toBe(false);
    }
  });

  it("maps axial coordinates to pixels (pointy-top)", () => {
    expect(axialToPixel(0, 0, 10)).toEqual({ x: 0, y: 0 });

    const p = axialToPixel(1, 0, 10);

    expect(p.x).toBeCloseTo(10 * Math.sqrt(3));
    expect(p.y).toBe(0);
  });
});

describe("token helpers", () => {
  it("counts pips as probability out of 36", () => {
    expect(pipCount(2)).toBe(1);
    expect(pipCount(8)).toBe(5);
    expect(pipCount(6)).toBe(5);
    expect(pipCount(12)).toBe(1);
  });

  it("flags 6 and 8 as red", () => {
    expect(isRedNumber(6)).toBe(true);
    expect(isRedNumber(8)).toBe(true);
    expect(isRedNumber(5)).toBe(false);
    expect(isRedNumber(9)).toBe(false);
  });

  it("maps every terrain to its resource", () => {
    expect(TERRAIN_RESOURCE.forest).toBe("wood");
    expect(TERRAIN_RESOURCE.mountains).toBe("ore");
    expect(TERRAIN_RESOURCE.desert).toBeNull();
  });
});

describe("generateCatanBoard", () => {
  it("has the right terrain tiles, one number-less desert, and the token set", () => {
    const board = generateCatanBoard(1);

    expect(board.hexes).toHaveLength(19);

    const counts = new Map<CatanTerrain, number>();

    for (const h of board.hexes) {
      counts.set(h.terrain, (counts.get(h.terrain) ?? 0) + 1);
    }

    expect(counts.get("forest")).toBe(4);
    expect(counts.get("pasture")).toBe(4);
    expect(counts.get("fields")).toBe(4);
    expect(counts.get("hills")).toBe(3);
    expect(counts.get("mountains")).toBe(3);
    expect(counts.get("desert")).toBe(1);

    const desert = board.hexes.filter(h => h.terrain === "desert");

    expect(desert).toHaveLength(1);
    expect(desert[0].number).toBeNull();

    const numbers = board.hexes
      .filter(h => h.terrain !== "desert")
      .map(h => h.number as number)
      .sort((a, b) => a - b);

    expect(numbers).toEqual([...NUMBER_TOKENS].sort((a, b) => a - b));
  });

  it("deals the nine harbours (4 generic + one per resource)", () => {
    const board = generateCatanBoard(7);

    expect(board.ports).toHaveLength(9);

    const byType = new Map<string, number>();

    for (const p of board.ports) {
      byType.set(p.type, (byType.get(p.type) ?? 0) + 1);
    }

    expect(byType.get("generic")).toBe(4);
    expect(byType.get("wood")).toBe(1);
    expect(byType.get("brick")).toBe(1);
    expect(byType.get("wool")).toBe(1);
    expect(byType.get("grain")).toBe(1);
    expect(byType.get("ore")).toBe(1);
  });

  it("is deterministic for a given seed and varies across seeds", () => {
    expect(generateCatanBoard(42)).toEqual(generateCatanBoard(42));

    const a = generateCatanBoard(1).hexes.map(h => `${h.terrain}${h.number}`);
    const b = generateCatanBoard(2).hexes.map(h => `${h.terrain}${h.number}`);

    expect(a).not.toEqual(b);
    expect(generateCatanBoard(99).seed).toBe(99);
  });

  it("never places two reds or two equal numbers next to each other", () => {
    for (let seed = 0; seed < 30; seed++) {
      const board = generateCatanBoard(seed);
      const numberOf = new Map(board.hexes.map(h => [h.id, h.number]));

      for (const h of board.hexes) {
        if (h.number === null) {
          continue;
        }

        for (const nb of HEX_NEIGHBOURS[h.id]) {
          const other = numberOf.get(nb);

          if (other === null || other === undefined) {
            continue;
          }

          expect(other).not.toBe(h.number);

          if (isRedNumber(h.number)) {
            expect(isRedNumber(other)).toBe(false);
          }
        }
      }
    }
  });

  it("accepts a default random seed", () => {
    const board = generateCatanBoard();

    expect(board.hexes).toHaveLength(19);
    expect(board.seed).toBeGreaterThanOrEqual(0);
  });

  const ring = (q: number, r: number) =>
    (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;

  const desertOf = (board: ReturnType<typeof generateCatanBoard>) =>
    board.hexes.find(h => h.terrain === "desert");

  it("keeps the desert on the centre hex by default", () => {
    for (let seed = 0; seed < 20; seed++) {
      const d = desertOf(generateCatanBoard(seed));

      expect(d?.q).toBe(0);
      expect(d?.r).toBe(0);
    }
  });

  it("opens the inner ring but never the coast when only inner is allowed", () => {
    const spots = new Set<string>();

    for (let seed = 0; seed < 40; seed++) {
      const d = desertOf(generateCatanBoard(seed, { desertInnerRing: true }));

      expect(ring(d?.q ?? 0, d?.r ?? 0)).toBeLessThanOrEqual(1);
      spots.add(`${d?.q},${d?.r}`);
    }

    expect(spots.size).toBeGreaterThan(1);
  });

  it("opens the outer ring but not the inner when only outer is allowed", () => {
    for (let seed = 0; seed < 40; seed++) {
      const d = desertOf(generateCatanBoard(seed, { desertOuterRing: true }));

      expect(ring(d?.q ?? 0, d?.r ?? 0)).not.toBe(1);
    }
  });

  it("never places a triangle of identical resources", () => {
    for (let seed = 0; seed < 30; seed++) {
      const byId: CatanTerrain[] = [];

      for (const h of generateCatanBoard(seed).hexes) {
        byId[h.id] = h.terrain;
      }

      expect(hasMonoTriangle(byId)).toBe(false);
    }

    // An all-one-resource board is nothing but triangles.
    expect(hasMonoTriangle(HEX_CELLS.map(() => "forest"))).toBe(true);
  });

  it("scores clustering by tiles beyond a pair in each same-resource group", () => {
    // One big forest blob (17 tiles) + a lone pasture + the desert.
    const t: CatanTerrain[] = HEX_CELLS.map(() => "forest");
    t[0] = "desert";
    t[9] = "pasture";

    // Forest group of 17 → 15 over a pair; the lone pasture costs nothing.
    expect(clusterPenalty(t)).toBe(15);

    // A generated board keeps the clustering low.
    const byId: CatanTerrain[] = [];

    for (const h of generateCatanBoard(1).hexes) {
      byId[h.id] = h.terrain;
    }

    expect(clusterPenalty(byId)).toBeLessThan(4);
  });

  it("ignores every constraint when asked (still the right pieces)", () => {
    const board = generateCatanBoard(3, { ignoreConstraints: true });

    expect(board.hexes).toHaveLength(19);
    expect(board.hexes.filter(h => h.terrain === "desert")).toHaveLength(1);
    expect(board.ports).toHaveLength(9);

    const numbers = board.hexes
      .filter(h => h.terrain !== "desert")
      .map(h => h.number as number)
      .sort((a, b) => a - b);

    expect(numbers).toEqual([...NUMBER_TOKENS].sort((a, b) => a - b));

    // Freed of the ring rule, the desert can leave the centre across seeds.
    const spots = new Set<string>();

    for (let seed = 0; seed < 40; seed++) {
      const d = desertOf(generateCatanBoard(seed, { ignoreConstraints: true }));
      spots.add(`${d?.q},${d?.r}`);
    }

    expect(spots.size).toBeGreaterThan(1);
  });
});
