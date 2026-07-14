/**
 * Balanced random board generator for **Catan (base game, 3–4 players)**.
 *
 * Faithful to the rulebook's "variable setup": 19 terrain hexes (4 forest,
 * 4 pasture, 4 fields, 3 hills, 3 mountains, 1 desert) laid out as the classic
 * 3-4-5-4-3 hexagon, the 18 number tokens (2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,
 * 11,11,12 — no 7, none on the desert), and 9 harbours (4 generic 3:1 + one
 * 2:1 per resource).
 *
 * "Balanced" adds the community/expert rules on top of a pure shuffle:
 *  - the red numbers **6 and 8 are never adjacent** (official expert rule);
 *  - **two identical numbers are never adjacent**;
 *  - among many valid candidates we keep the one whose production is spread
 *    most evenly across the board (lowest variance of the pip totals at the
 *    intersections where three hexes meet, plus an even spread per resource).
 *
 * Pure and deterministic given a `seed`, so it is fully unit-testable; the UI
 * omits the seed for a fresh random board each tap.
 */

export type CatanTerrain =
  | "forest"
  | "pasture"
  | "fields"
  | "hills"
  | "mountains"
  | "desert";

export type CatanResource = "wood" | "wool" | "grain" | "brick" | "ore";

/** A harbour: `generic` trades 3:1, a resource trades that resource 2:1. */
export type CatanPortType = "generic" | CatanResource;

/** The resource a terrain produces (`null` for the desert). */
export const TERRAIN_RESOURCE: Record<CatanTerrain, CatanResource | null> = {
  forest: "wood",
  pasture: "wool",
  fields: "grain",
  hills: "brick",
  mountains: "ore",
  desert: null,
};

/** Terrain tiles in the box, by count (19 total). */
const TERRAIN_COUNTS: Record<CatanTerrain, number> = {
  forest: 4,
  pasture: 4,
  fields: 4,
  hills: 3,
  mountains: 3,
  desert: 1,
};

/** The 18 number tokens dealt to the non-desert hexes. */
export const NUMBER_TOKENS = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
] as const;

/** The 9 harbours: 4 generic (3:1) + one 2:1 per resource. */
const PORT_TYPES: CatanPortType[] = [
  "generic",
  "generic",
  "generic",
  "generic",
  "wood",
  "brick",
  "wool",
  "grain",
  "ore",
];

/** Dots on a token = its probability out of 36 rolls; 6 and 8 are the "red" 5s. */
export function pipCount(n: number): number {
  return 6 - Math.abs(7 - n);
}

/** The high-frequency numbers (5 pips) printed in red. */
export function isRedNumber(n: number): boolean {
  return n === 6 || n === 8;
}

/** The six axial neighbour directions (orientation-independent). */
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export interface HexCell {
  id: number;
  /** Axial coordinates on the radius-2 hexagon. */
  q: number;
  r: number;
}

/**
 * The fixed board geometry (the tiles' positions never change — only their
 * terrain and numbers do): all axial cells of the radius-2 hexagon, ordered
 * top-to-bottom then left-to-right so ids read like the physical 3-4-5-4-3 rows.
 */
export const HEX_CELLS: HexCell[] = buildCells();

/** For each hex id, the ids of its on-board neighbours. */
export const HEX_NEIGHBOURS: number[][] = buildNeighbours(HEX_CELLS);

/** Triples of mutually-adjacent hexes — the interior intersections. */
const HEX_VERTICES: ReadonlyArray<readonly [number, number, number]> =
  buildVertices(HEX_NEIGHBOURS);

/**
 * A harbour slot: the coastal hex it hugs and the off-board direction its edge
 * faces (`dq`/`dr`), enough for the UI to place it on the coastline. Positions
 * are fixed; only the port TYPE is randomised.
 */
export interface PortSlot {
  hexId: number;
  dq: number;
  dr: number;
}

/** The 9 fixed harbour edges, spaced around the coast. */
export const PORT_SLOTS: PortSlot[] = buildPortSlots(HEX_CELLS, HEX_NEIGHBOURS);

export interface BoardHex {
  id: number;
  q: number;
  r: number;
  terrain: CatanTerrain;
  /** The number token (2–12, never 7); `null` on the desert. */
  number: number | null;
}

export interface BoardPort extends PortSlot {
  type: CatanPortType;
}

export interface CatanBoard {
  hexes: BoardHex[];
  ports: BoardPort[];
  seed: number;
}

/** Tunable rules for the generator. */
export interface BoardOptions {
  /**
   * Keep the desert on the **centre** hex (base-game convention, the default).
   * When `false` the desert may also land on the **inner ring** — but never on
   * the outer coast.
   */
  desertCentered?: boolean;
}

/** Axial radius-2 hexagon → 19 cells, ordered by row (r) then column (q). */
function buildCells(): HexCell[] {
  const cells: HexCell[] = [];

  for (let r = -2; r <= 2; r++) {
    for (let q = -2; q <= 2; q++) {
      if (Math.abs(q + r) <= 2) {
        cells.push({ id: 0, q, r });
      }
    }
  }
  cells.forEach((c, i) => {
    c.id = i;
  });

  return cells;
}

function buildNeighbours(cells: HexCell[]): number[][] {
  const index = new Map<string, number>();

  for (const c of cells) {
    index.set(`${c.q},${c.r}`, c.id);
  }

  return cells.map(c => {
    const out: number[] = [];

    for (const [dq, dr] of DIRECTIONS) {
      const id = index.get(`${c.q + dq},${c.r + dr}`);

      if (id !== undefined) {
        out.push(id);
      }
    }

    return out;
  });
}

function buildVertices(
  neighbours: number[][],
): Array<[number, number, number]> {
  const seen = new Set<string>();
  const out: Array<[number, number, number]> = [];

  for (let a = 0; a < neighbours.length; a++) {
    for (const b of neighbours[a]) {
      for (const c of neighbours[a]) {
        if (b < c && neighbours[b].includes(c)) {
          const key = [a, b, c].sort((x, y) => x - y).join(",");

          if (!seen.has(key)) {
            seen.add(key);
            out.push([a, b, c]);
          }
        }
      }
    }
  }

  return out;
}

/** Pointy-top axial → pixel centre (unit size 1); shared with the renderer. */
export function axialToPixel(
  q: number,
  r: number,
  size: number,
): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * 1.5 * r;

  return { x, y };
}

/** Nine coastal edges, evenly spaced around the perimeter by angle. */
function buildPortSlots(cells: HexCell[], neighbours: number[][]): PortSlot[] {
  const edges: Array<{ slot: PortSlot; angle: number }> = [];

  for (const cell of cells) {
    for (const [dq, dr] of DIRECTIONS) {
      const has = neighbours[cell.id].some(nid => {
        const n = cells[nid];

        return n.q === cell.q + dq && n.r === cell.r + dr;
      });

      if (!has) {
        const c = axialToPixel(cell.q, cell.r, 1);
        const o = axialToPixel(cell.q + dq, cell.r + dr, 1);
        const mid = { x: (c.x + o.x) / 2, y: (c.y + o.y) / 2 };

        edges.push({
          slot: { hexId: cell.id, dq, dr },
          angle: Math.atan2(mid.y, mid.x),
        });
      }
    }
  }
  edges.sort((a, b) => a.angle - b.angle);

  const slots: PortSlot[] = [];

  for (let i = 0; i < 9; i++) {
    slots.push(edges[Math.round((i * edges.length) / 9)].slot);
  }

  return slots;
}

/** Small, fast, seedable PRNG (mulberry32) for reproducible boards. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

/** The 18 non-desert terrain tiles (the desert is placed on its own). */
function nonDesertTerrains(): CatanTerrain[] {
  const bag: CatanTerrain[] = [];

  for (const terrain of Object.keys(TERRAIN_COUNTS) as CatanTerrain[]) {
    if (terrain === "desert") {
      continue;
    }

    for (let i = 0; i < TERRAIN_COUNTS[terrain]; i++) {
      bag.push(terrain);
    }
  }

  return bag;
}

/** Ring of a hex from the centre: 0 (centre), 1 (inner ring), 2 (coast). */
function ringOf(cell: HexCell): number {
  return (Math.abs(cell.q) + Math.abs(cell.r) + Math.abs(cell.q + cell.r)) / 2;
}

/**
 * Places the 18 tokens on the non-desert hexes by backtracking, honouring the
 * hard rules (no two reds adjacent, no two equal numbers adjacent). Returns a
 * map hexId → number, or `null` if this shuffle painted itself into a corner.
 */
function placeNumbers(
  hexIds: number[],
  rng: () => number,
): Map<number, number> | null {
  const assigned = new Map<number, number>();
  // Remaining tokens indexed by value (2..12); never undefined.
  const counts: number[] = new Array(13).fill(0);

  for (const n of NUMBER_TOKENS) {
    counts[n] += 1;
  }

  const distinct = [...new Set(NUMBER_TOKENS)];

  const fits = (hexId: number, n: number): boolean => {
    for (const nb of HEX_NEIGHBOURS[hexId]) {
      const other = assigned.get(nb);

      if (other === undefined) {
        continue;
      }

      if (other === n) {
        return false;
      }

      if (isRedNumber(n) && isRedNumber(other)) {
        return false;
      }
    }

    return true;
  };

  const step = (index: number): boolean => {
    if (index === hexIds.length) {
      return true;
    }

    const hexId = hexIds[index];
    const candidates = shuffle(
      distinct.filter(n => counts[n] > 0),
      rng,
    );

    for (const n of candidates) {
      if (!fits(hexId, n)) {
        continue;
      }

      assigned.set(hexId, n);
      counts[n] -= 1;

      if (step(index + 1)) {
        return true;
      }

      assigned.delete(hexId);
      counts[n] += 1;
    }

    return false;
  };

  const solved = step(0);

  /* c8 ignore next 3 -- unreachable: this token set always has a placement */
  if (!solved) {
    return null;
  }

  return assigned;
}

/**
 * Lower is better: how UNbalanced this number placement is. Combines the
 * spread of production across intersections (variance of the pip totals where
 * three hexes meet) with an even spread of pips per resource.
 */
function imbalance(hexes: BoardHex[]): number {
  const pips = hexes.map(h => (h.number === null ? 0 : pipCount(h.number)));

  const sums = HEX_VERTICES.map(([a, b, c]) => pips[a] + pips[b] + pips[c]);
  const mean = sums.reduce((s, v) => s + v, 0) / sums.length;
  const vertexVar = sums.reduce((s, v) => s + (v - mean) ** 2, 0) / sums.length;

  const perResource = new Map<CatanResource, number>();

  for (const h of hexes) {
    const res = TERRAIN_RESOURCE[h.terrain];

    if (res === null) {
      continue;
    }

    perResource.set(res, (perResource.get(res) ?? 0) + pips[h.id]);
  }

  const totals = [...perResource.values()];
  const resMean = totals.reduce((s, v) => s + v, 0) / totals.length;
  const resVar =
    totals.reduce((s, v) => s + (v - resMean) ** 2, 0) / totals.length;

  return vertexVar + resVar;
}

/** Number of balanced candidates evaluated per generation (best is kept). */
const CANDIDATES = 40;

/**
 * Generates a balanced Catan board. Deterministic for a given `seed`
 * (defaults to a random one). The desert is placed per `options`
 * (centre by default), the other 18 terrains are shuffled freely, and the
 * numbers obey the balance rules with the most evenly-spread candidate kept.
 */
export function generateCatanBoard(
  seed?: number,
  options?: BoardOptions,
): CatanBoard {
  const desertCentered = options?.desertCentered ?? true;
  // A random 32-bit seed when none is given. Uses Web Crypto (not
  // `Math.random`) purely to keep static analysis happy — a board layout has no
  // security relevance either way.
  const actualSeed = seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  const rng = mulberry32(actualSeed);

  // Place the desert on an allowed hex (centre only, or the inner ring too),
  // then shuffle the other 18 terrains over the remaining hexes.
  const desertHexes = HEX_CELLS.filter(c =>
    desertCentered ? ringOf(c) === 0 : ringOf(c) <= 1,
  );
  const desertId = desertHexes[Math.floor(rng() * desertHexes.length)].id;

  const rest = shuffle(nonDesertTerrains(), rng);
  let ri = 0;
  const hexes: BoardHex[] = HEX_CELLS.map(cell => ({
    id: cell.id,
    q: cell.q,
    r: cell.r,
    terrain: cell.id === desertId ? "desert" : rest[ri++],
    number: null,
  }));

  const numberedIds = hexes.filter(h => h.terrain !== "desert").map(h => h.id);

  let best: Map<number, number> | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 0; i < CANDIDATES; i++) {
    const placement = placeNumbers(numberedIds, rng);

    /* c8 ignore next 3 -- defensive: this constraint set is always solvable */
    if (placement === null) {
      continue;
    }

    const scored = hexes.map(h => ({
      ...h,
      number: placement.get(h.id) ?? null,
    }));
    const score = imbalance(scored);

    if (score < bestScore) {
      bestScore = score;
      best = placement;
    }
  }

  // Backtracking on these constraints is always solvable, but guard anyway.
  /* c8 ignore next 3 -- unreachable: a valid placement always exists */
  if (best === null) {
    best = placeNumbers(numberedIds, rng) ?? new Map();
  }

  for (const h of hexes) {
    h.number = best.get(h.id) ?? null;
  }

  const portTypes = shuffle(PORT_TYPES, rng);
  const ports: BoardPort[] = PORT_SLOTS.map((slot, i) => ({
    ...slot,
    type: portTypes[i],
  }));

  return { hexes, ports, seed: actualSeed };
}
