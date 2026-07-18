/**
 * Balanced random board generator for **Catan** — the base game (3–4 players,
 * 19 hexes) and the **5–6 player extension** (30 hexes), selected by
 * {@link BoardOptions.variant}.
 *
 * Faithful to each rulebook's "variable setup":
 *  - **base**: 19 terrain hexes (4 forest, 4 pasture, 4 fields, 3 hills,
 *    3 mountains, 1 desert) as the classic 3-4-5-4-3 hexagon, 18 number tokens
 *    (2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12 — no 7, none on the desert), and
 *    9 harbours (4 generic 3:1 + one 2:1 per resource);
 *  - **extension**: 30 terrain hexes (6/6/6 forest/pasture/fields, 5/5
 *    hills/mountains, 2 deserts) as the elongated 3-4-5-6-5-4-3 board, 28 number
 *    tokens (each of 2–12 with the base multiplicities scaled up), and 11
 *    harbours (5 generic 3:1 + one 2:1 per resource, with wool doubled).
 *
 * "Balanced" adds the community/expert rules on top of a pure shuffle:
 *  - the desert stays on the centre by default on the base board (`BoardOptions`
 *    opens the inner/outer ring); the extension scatters its two deserts (with
 *    an option to allow them adjacent);
 *  - resources never form a **mono-coloured triangle** (a straight line of 3–4
 *    is fine — only the closed triangle of three mutually-adjacent same tiles);
 *  - the red numbers **6 and 8 are never adjacent** (official expert rule);
 *  - **two identical numbers are never adjacent**;
 *  - each resource's production stays within a tolerance of its balanced share,
 *    and (optionally) is spread evenly *within* the resource — no single tile
 *    hogging all its pips (penalised exponentially);
 *  - (optionally) no intersection is over-powered: the summed pips where three
 *    hexes meet stay under a max cap (a weak corner is harmless, so there is no
 *    lower bound);
 *  - among the survivors we keep the one whose production spreads most evenly
 *    across the intersections.
 *
 * `BoardOptions.ignoreConstraints` drops all of the above for a raw shuffle.
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

/** Which board is generated: the base game or the 5–6 player extension. */
export type CatanVariantId = "base" | "extension";

/** The resource a terrain produces (`null` for the desert). */
export const TERRAIN_RESOURCE: Record<CatanTerrain, CatanResource | null> = {
  forest: "wood",
  pasture: "wool",
  fields: "grain",
  hills: "brick",
  mountains: "ore",
  desert: null,
};

/** Dots on a token = its probability out of 36 rolls; 6 and 8 are the "red" 5s. */
export function pipCount(n: number): number {
  return 6 - Math.abs(7 - n);
}

/** The high-frequency numbers (5 pips) printed in red. */
export function isRedNumber(n: number): boolean {
  return n === 6 || n === 8;
}

/**
 * Total dice combinations (summed pips) each resource can produce on a board —
 * a quick read of its structure: which resource is over- or under-served. The
 * five resources always sum to the board's total pips (58 on the base game, 88
 * on the extension).
 */
export function resourceCombinations(
  hexes: BoardHex[],
): Array<{ resource: CatanResource; combos: number }> {
  const totals = new Map<CatanResource, number>();

  for (const h of hexes) {
    const res = TERRAIN_RESOURCE[h.terrain];

    if (res === null || h.number === null) {
      continue;
    }

    totals.set(res, (totals.get(res) ?? 0) + pipCount(h.number));
  }

  const order: CatanResource[] = ["wood", "brick", "wool", "grain", "ore"];

  return order.map(resource => ({
    resource,
    combos: totals.get(resource) ?? 0,
  }));
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
  /** Axial coordinates on the board. */
  q: number;
  r: number;
}

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

export interface BoardHex {
  id: number;
  q: number;
  r: number;
  terrain: CatanTerrain;
  /** The number token (2–12, never 7); `null` on a desert. */
  number: number | null;
}

export interface BoardPort extends PortSlot {
  type: CatanPortType;
}

export interface CatanBoard {
  variant: CatanVariantId;
  hexes: BoardHex[];
  ports: BoardPort[];
  seed: number;
}

/**
 * A fully-derived board layout: the fixed geometry (cells, adjacency,
 * intersections, harbour slots) plus the box contents (terrain counts, number
 * tokens, port types) and a few precomputed totals. The tiles' positions never
 * change — only their terrain and numbers do.
 */
export interface CatanVariant {
  id: CatanVariantId;
  cells: HexCell[];
  /** For each hex id, the ids of its on-board neighbours. */
  neighbours: number[][];
  /** Triples of mutually-adjacent hexes — the interior intersections. */
  vertices: ReadonlyArray<readonly [number, number, number]>;
  /** The fixed harbour edges, spaced around the coast. */
  portSlots: PortSlot[];
  /** For each harbour slot, the on-board tiles its two access points touch. */
  portTouched: number[][];
  terrainCounts: Record<CatanTerrain, number>;
  numberTokens: number[];
  portTypes: CatanPortType[];
  /** Summed pips across the number tokens (58 base, 88 extension). */
  totalPips: number;
  /** Tiles a resource owns on this board. */
  tileCount: Record<CatanResource, number>;
}

/** Tunable rules for the generator. */
export interface BoardOptions {
  /** Which board to build (default `"base"`). */
  variant?: CatanVariantId;
  /** Allow the desert on the inner ring — base board only (default centre). */
  desertInnerRing?: boolean;
  /** Allow the desert on the outer coast — base board only (default centre). */
  desertOuterRing?: boolean;
  /** Let the extension's two deserts sit on adjacent hexes (default `false`). */
  allowAdjacentDeserts?: boolean;
  /**
   * Drop every placement constraint (mono-triangle, adjacent reds/duplicates,
   * balancing, desert placement) for a fully random board.
   */
  ignoreConstraints?: boolean;
  /**
   * How far each resource's total dice combinations may stray from its balanced
   * share, as a fraction (default `0.2` = ±20%). The balanced share is
   * proportional to a resource's tile count, so a 3-tile resource (brick, ore
   * on the base board) expects fewer combinations than a 4-tile one.
   */
  balanceTolerance?: number;
  /** Forbid two red numbers (6/8) on adjacent hexes (default `true`). */
  avoidAdjacentReds?: boolean;
  /** Forbid the same number on adjacent hexes (default `true`). */
  avoidAdjacentDuplicates?: boolean;
  /** Prefer terrains that avoid 3+ blobs of a resource (default `true`). */
  avoidResourceClusters?: boolean;
  /** Rank numbers by even production across intersections (default `true`). */
  balanceIntersections?: boolean;
  /**
   * Penalise a resource whose pips are unevenly split across its tiles (one
   * hot tile + dead ones), so no resource is over-concentrated (default
   * `true`). The penalty grows exponentially once the spread is more than mild.
   */
  penalizeResourceVariance?: boolean;
  /**
   * Discourage an over-strong intersection — one whose summed pips exceed
   * {@link BoardOptions.maxIntersectionPips} would be an unbalanced opening
   * settlement spot (default `true`). There is no lower cap: a weak
   * intersection is harmless.
   */
  limitIntersectionPips?: boolean;
  /** Highest summed pips tolerated at an intersection when capping (default 12). */
  maxIntersectionPips?: number;
  /** Keep a 2:1 port off a coastal tile of its own resource (default `false`). */
  avoidPortOnResource?: boolean;
  /** Terrain layouts sampled (default 60). */
  terrainCandidates?: number;
  /** Number placements sampled (default 40). */
  numberCandidates?: number;
}

/** Axial radius-2 hexagon → 19 cells, ordered by row (r) then column (q). */
function buildBaseCells(): HexCell[] {
  const cells: HexCell[] = [];

  for (let r = -2; r <= 2; r++) {
    for (let q = -2; q <= 2; q++) {
      if (Math.abs(q + r) <= 2) {
        cells.push({ id: 0, q, r });
      }
    }
  }

  return withIds(cells);
}

/**
 * The elongated 3-4-5-6-5-4-3 board of the 5–6 player extension → 30 cells.
 * Each row's `q` range is given explicitly (a stretched hexagon has no single
 * clean inequality); ordered top-to-bottom then left-to-right.
 */
function buildExtensionCells(): HexCell[] {
  // [r, qStart, qEnd] per row — lengths 3,4,5,6,5,4,3 = 30.
  const rows: Array<[number, number, number]> = [
    [-3, 0, 2],
    [-2, -1, 2],
    [-1, -2, 2],
    [0, -3, 2],
    [1, -3, 1],
    [2, -3, 0],
    [3, -3, -1],
  ];
  const cells: HexCell[] = [];

  for (const [r, qStart, qEnd] of rows) {
    for (let q = qStart; q <= qEnd; q++) {
      cells.push({ id: 0, q, r });
    }
  }

  return withIds(cells);
}

/** Assigns sequential ids in the current order. */
function withIds(cells: HexCell[]): HexCell[] {
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

/** `count` coastal edges, evenly spaced around the perimeter by angle. */
function buildPortSlots(
  cells: HexCell[],
  neighbours: number[][],
  count: number,
): PortSlot[] {
  const centre = cells.reduce(
    (acc, cell) => {
      const p = axialToPixel(cell.q, cell.r, 1);

      return { x: acc.x + p.x / cells.length, y: acc.y + p.y / cells.length };
    },
    { x: 0, y: 0 },
  );
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
          angle: Math.atan2(mid.y - centre.y, mid.x - centre.x),
        });
      }
    }
  }
  edges.sort((a, b) => a.angle - b.angle);

  const slots: PortSlot[] = [];

  for (let i = 0; i < count; i++) {
    slots.push(
      edges[Math.round((i * edges.length) / count) % edges.length].slot,
    );
  }

  return slots;
}

/**
 * For each harbour slot, the on-board tiles its two access points touch — the
 * coastal tile it hugs plus the tile at each shared corner (the neighbours of
 * the coastal hex on either side of the port edge). Used to keep a 2:1 port off
 * *any* tile of its own resource, not just the one it sits on.
 */
function buildPortTouched(cells: HexCell[], portSlots: PortSlot[]): number[][] {
  const idAt = (q: number, r: number): number | undefined =>
    cells.find(c => c.q === q && c.r === r)?.id;

  return portSlots.map(slot => {
    const cell = cells[slot.hexId];
    const dir = DIRECTIONS.findIndex(
      ([x, y]) => x === slot.dq && y === slot.dr,
    );
    const touched = [slot.hexId];

    // The two edges flanking the port edge (dir ± 1) share its access corners.
    for (const step of [1, 5]) {
      const [sdq, sdr] = DIRECTIONS[(dir + step) % 6];
      const nid = idAt(cell.q + sdq, cell.r + sdr);

      if (nid !== undefined) {
        touched.push(nid);
      }
    }

    return touched;
  });
}

/** Tiles each resource owns, from a terrain-count table. */
function resourceTileCount(
  terrainCounts: Record<CatanTerrain, number>,
): Record<CatanResource, number> {
  const out: Record<CatanResource, number> = {
    wood: 0,
    wool: 0,
    grain: 0,
    brick: 0,
    ore: 0,
  };

  for (const terrain of Object.keys(terrainCounts) as CatanTerrain[]) {
    const res = TERRAIN_RESOURCE[terrain];

    if (res !== null) {
      out[res] += terrainCounts[terrain];
    }
  }

  return out;
}

/** Derives a full {@link CatanVariant} from a board's raw box contents. */
function buildVariant(
  id: CatanVariantId,
  cells: HexCell[],
  terrainCounts: Record<CatanTerrain, number>,
  numberTokens: number[],
  portTypes: CatanPortType[],
): CatanVariant {
  const neighbours = buildNeighbours(cells);
  const vertices = buildVertices(neighbours);
  const portSlots = buildPortSlots(cells, neighbours, portTypes.length);
  const portTouched = buildPortTouched(cells, portSlots);
  const totalPips = numberTokens.reduce((sum, n) => sum + pipCount(n), 0);

  return {
    id,
    cells,
    neighbours,
    vertices,
    portSlots,
    portTouched,
    terrainCounts,
    numberTokens,
    portTypes,
    totalPips,
    tileCount: resourceTileCount(terrainCounts),
  };
}

/** The base game (3–4 players): 19 hexes, 18 tokens, 9 harbours. */
export const BASE_VARIANT: CatanVariant = buildVariant(
  "base",
  buildBaseCells(),
  { forest: 4, pasture: 4, fields: 4, hills: 3, mountains: 3, desert: 1 },
  [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
  [
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
);

/** The 5–6 player extension: 30 hexes, 28 tokens, 11 harbours (wool ×2). */
export const EXTENSION_VARIANT: CatanVariant = buildVariant(
  "extension",
  buildExtensionCells(),
  { forest: 6, pasture: 6, fields: 6, hills: 5, mountains: 5, desert: 2 },
  [
    2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11,
    11, 11, 12, 12,
  ],
  [
    "generic",
    "generic",
    "generic",
    "generic",
    "generic",
    "wood",
    "brick",
    "wool",
    "wool",
    "grain",
    "ore",
  ],
);

/** The board layout for a variant id. */
export function variantOf(id: CatanVariantId): CatanVariant {
  return id === "extension" ? EXTENSION_VARIANT : BASE_VARIANT;
}

/** The base geometry, exported for the renderer and tests. */
export const HEX_CELLS: HexCell[] = BASE_VARIANT.cells;
export const HEX_NEIGHBOURS: number[][] = BASE_VARIANT.neighbours;
export const PORT_SLOTS: PortSlot[] = BASE_VARIANT.portSlots;
export const PORT_TOUCHED: number[][] = BASE_VARIANT.portTouched;
export const NUMBER_TOKENS: number[] = BASE_VARIANT.numberTokens;

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

/** The non-desert terrain tiles of a variant (the deserts are placed apart). */
function nonDesertTerrains(variant: CatanVariant): CatanTerrain[] {
  const bag: CatanTerrain[] = [];

  for (const terrain of Object.keys(variant.terrainCounts) as CatanTerrain[]) {
    if (terrain === "desert") {
      continue;
    }

    for (let i = 0; i < variant.terrainCounts[terrain]; i++) {
      bag.push(terrain);
    }
  }

  return bag;
}

/** Ring of a base-board hex from the centre: 0 (centre), 1 (inner), 2 (coast). */
function ringOf(cell: HexCell): number {
  return (Math.abs(cell.q) + Math.abs(cell.r) + Math.abs(cell.q + cell.r)) / 2;
}

/** Fresh greedy attempts before giving up on a number placement. */
const PLACEMENT_RESTARTS = 200;

/**
 * Places the tokens on the non-desert hexes, honouring the hard rules (no two
 * reds adjacent, no two equal numbers adjacent). Returns a map hexId → number,
 * or `null` if it could not (a satisfiable board effectively always succeeds).
 *
 * Each attempt is a single **greedy, most-constrained-first pass** (MRV): fill
 * the unassigned hex with the fewest legal tokens, picking one at random. If a
 * hex is ever left with no legal token, the attempt is abandoned and a fresh
 * one starts. Catan's number rules are loose, so a pass almost always succeeds
 * outright; the occasional dead end just restarts. This stays **linear per
 * attempt** — unlike exhaustive backtracking, which blows up to minutes on the
 * 28-tile extension board.
 */
function placeNumbers(
  hexIds: number[],
  rng: () => number,
  avoidReds: boolean,
  avoidDuplicates: boolean,
  variant: CatanVariant,
): Map<number, number> | null {
  const distinct = [...new Set(variant.numberTokens)];

  const fits = (
    assigned: Map<number, number>,
    hexId: number,
    n: number,
  ): boolean => {
    for (const nb of variant.neighbours[hexId]) {
      const other = assigned.get(nb);

      if (other === undefined) {
        continue;
      }

      if (avoidDuplicates && other === n) {
        return false;
      }

      if (avoidReds && isRedNumber(n) && isRedNumber(other)) {
        return false;
      }
    }

    return true;
  };

  const attempt = (): Map<number, number> | null => {
    const assigned = new Map<number, number>();
    const counts = new Array(13).fill(0);

    for (const n of variant.numberTokens) {
      counts[n] += 1;
    }

    const remaining = new Set(hexIds);

    while (remaining.size > 0) {
      // MRV: the unassigned hex with the fewest legal tokens right now.
      let target = -1;
      let fewest = Number.POSITIVE_INFINITY;
      let targetValues: number[] = [];

      for (const hexId of remaining) {
        const legal = distinct.filter(
          n => counts[n] > 0 && fits(assigned, hexId, n),
        );

        if (legal.length < fewest) {
          fewest = legal.length;
          targetValues = legal;
          target = hexId;

          if (fewest === 0) {
            break;
          }
        }
      }

      if (fewest === 0) {
        return null;
      }

      const n = targetValues[Math.floor(rng() * targetValues.length)];
      assigned.set(target, n);
      counts[n] -= 1;
      remaining.delete(target);
    }

    return assigned;
  };

  for (let i = 0; i < PLACEMENT_RESTARTS; i++) {
    const placement = attempt();

    if (placement !== null) {
      return placement;
    }
  }

  /* c8 ignore next -- unreachable: this token set always has a placement */
  return null;
}

/** Default allowed deviation from a resource's balanced share (±20%). */
const DEFAULT_TOLERANCE = 0.2;

/** A resource's balanced combinations, proportional to its tile count. */
function expectedCombos(
  variant: CatanVariant,
  resource: CatanResource,
): number {
  return (
    (variant.tileCount[resource] * variant.totalPips) /
    variant.numberTokens.length
  );
}

/** Variance of a resource's pips below which no concentration penalty applies. */
const VARIANCE_SOFT_START = 0.8;
/** How fast the concentration penalty grows past the soft start. */
const VARIANCE_GROWTH = 1.2;

/**
 * Penalises resources whose production is concentrated on a few hot tiles (e.g.
 * ore on 8-3-2) rather than spread across its tiles. For each resource, the
 * variance of its tiles' pips feeds an exponential: near zero up to a mild
 * spread ({@link VARIANCE_SOFT_START}), then rising fast — so a lopsided
 * resource is pushed down hard while ordinary variety costs nothing.
 */
export function resourceVariancePenalty(hexes: BoardHex[]): number {
  const byResource = new Map<CatanResource, number[]>();

  for (const h of hexes) {
    const res = TERRAIN_RESOURCE[h.terrain];

    if (res === null || h.number === null) {
      continue;
    }

    const list = byResource.get(res) ?? [];
    list.push(pipCount(h.number));
    byResource.set(res, list);
  }

  let penalty = 0;

  for (const pips of byResource.values()) {
    const mean = pips.reduce((s, v) => s + v, 0) / pips.length;
    const variance =
      pips.reduce((s, v) => s + (v - mean) ** 2, 0) / pips.length;
    const excess = Math.max(0, variance - VARIANCE_SOFT_START);

    penalty += Math.exp(excess * VARIANCE_GROWTH) - 1;
  }

  return penalty;
}

/** Weight of each pip an intersection pokes above the max-pip cap. */
const CAP_WEIGHT = 4;

/**
 * Lower is better. The single **hard** rule is the resource band: each
 * resource's combinations must land within `tolerance` of its balanced share;
 * a board that breaches it scores 1000+ (worse the further it strays), so the
 * search always prefers a compliant board when the batch holds one. Among the
 * compliant boards it ranks by soft criteria — an even spread across the
 * intersections, no single resource over-concentrated, and no intersection
 * exceeding the max-pip cap (an over-powered opening spot) — none of which can
 * force a board out of balance; they only break ties, leaving natural variety.
 * A weak intersection is fine (no lower cap); only over-strong ones are
 * penalised. Each soft term is gated by its option.
 */
function numberBalance(
  hexes: BoardHex[],
  variant: CatanVariant,
  opts: {
    tolerance: number;
    balanceIntersections: boolean;
    penalizeVariance: boolean;
    limitPips: boolean;
    maxPips: number;
  },
): number {
  const pips = hexes.map(h => (h.number === null ? 0 : pipCount(h.number)));

  const sums = variant.vertices.map(([a, b, c]) => pips[a] + pips[b] + pips[c]);

  const perResource = new Map<CatanResource, number>();

  for (const h of hexes) {
    const res = TERRAIN_RESOURCE[h.terrain];

    if (res === null) {
      continue;
    }

    perResource.set(res, (perResource.get(res) ?? 0) + pips[h.id]);
  }

  let outOfRange = 0;

  for (const [res, combos] of perResource) {
    const expected = expectedCombos(variant, res);
    const lo = expected * (1 - opts.tolerance);
    const hi = expected * (1 + opts.tolerance);

    if (combos < lo) {
      outOfRange += lo - combos;
    } else if (combos > hi) {
      outOfRange += combos - hi;
    }
  }

  if (outOfRange > 0) {
    return 1000 + outOfRange;
  }

  // In balance: rank by soft criteria. With all off, compliant boards tie (0).
  const mean = sums.reduce((s, v) => s + v, 0) / sums.length;
  const vertexVar = sums.reduce((s, v) => s + (v - mean) ** 2, 0) / sums.length;

  let soft = opts.balanceIntersections ? vertexVar : 0;

  if (opts.penalizeVariance) {
    soft += resourceVariancePenalty(hexes);
  }

  if (opts.limitPips) {
    let excess = 0;

    for (const sum of sums) {
      if (sum > opts.maxPips) {
        excess += sum - opts.maxPips;
      }
    }

    soft += CAP_WEIGHT * excess;
  }

  return soft;
}

/** Default number of number placements sampled per generation. */
const CANDIDATES = 40;

/** Default number of terrain layouts sampled per generation. */
const TERRAIN_CANDIDATES = 60;

/** Rejection budget for keeping 2:1 ports off their own resource. */
const PORT_ATTEMPTS = 100;

/** Rejection budget for keeping the extension's two deserts apart. */
const DESERT_ATTEMPTS = 100;

/** Default max summed pips at an intersection when capping is on. */
const DEFAULT_MAX_PIPS = 12;

/**
 * True when a 2:1 resource port is adjacent to a tile of its own resource — i.e.
 * one of the tiles its access points touch ({@link CatanVariant.portTouched})
 * produces that resource. Generic 3:1 ports are exempt.
 */
function portTouchesOwnResource(
  portTypes: CatanPortType[],
  terrainByHex: CatanTerrain[],
  variant: CatanVariant,
): boolean {
  for (let i = 0; i < variant.portSlots.length; i++) {
    const type = portTypes[i];

    if (type === "generic") {
      continue;
    }

    for (const hexId of variant.portTouched[i]) {
      if (TERRAIN_RESOURCE[terrainByHex[hexId]] === type) {
        return true;
      }
    }
  }

  return false;
}

/**
 * True when three mutually-adjacent hexes share the same resource — a
 * "triangle" of identical terrain. A straight line of 3–4 same-resource tiles
 * is fine; only the closed triangle is disallowed. (Deserts can't form one:
 * there are at most two, never three mutually-adjacent.)
 */
export function hasMonoTriangle(
  terrainByHex: CatanTerrain[],
  variant: CatanVariant = BASE_VARIANT,
): boolean {
  for (const [a, b, c] of variant.vertices) {
    if (
      terrainByHex[a] === terrainByHex[b] &&
      terrainByHex[a] === terrainByHex[c]
    ) {
      return true;
    }
  }

  return false;
}

/**
 * How clustered the terrain is: for each connected group of same-resource
 * hexes, the tiles it holds beyond a pair (`size - 2` for groups of 3+, 0 for
 * singletons and pairs). So a stray pair costs nothing, but blobs of 3, 4… are
 * penalised — the generator prefers spread-out resources. Deserts are skipped.
 */
export function clusterPenalty(
  terrainByHex: CatanTerrain[],
  variant: CatanVariant = BASE_VARIANT,
): number {
  const seen: boolean[] = [];
  let penalty = 0;

  for (let start = 0; start < variant.cells.length; start++) {
    if (seen[start] || terrainByHex[start] === "desert") {
      continue;
    }

    const resource = terrainByHex[start];
    const queue = [start];
    seen[start] = true;
    let size = 0;

    while (queue.length > 0) {
      const h = queue.pop() as number;
      size += 1;

      for (const nb of variant.neighbours[h]) {
        if (!seen[nb] && terrainByHex[nb] === resource) {
          seen[nb] = true;
          queue.push(nb);
        }
      }
    }

    if (size >= 3) {
      penalty += size - 2;
    }
  }

  return penalty;
}

/** Number of edges between two adjacent tiles of the same resource. */
export function adjacentSamePairs(
  terrainByHex: CatanTerrain[],
  variant: CatanVariant = BASE_VARIANT,
): number {
  let count = 0;

  for (let a = 0; a < variant.neighbours.length; a++) {
    for (const b of variant.neighbours[a]) {
      if (b > a && terrainByHex[a] === terrainByHex[b]) {
        count += 1;
      }
    }
  }

  return count;
}

/** Free adjacent same-resource pairs before the malus kicks in. */
const FREE_ADJACENT_PAIRS = 3;

/**
 * How undesirable a terrain layout is: its 3+ resource blobs
 * ({@link clusterPenalty}) plus a malus for each adjacent same-resource pair
 * beyond {@link FREE_ADJACENT_PAIRS} (so up to 3 pairs are free, but boards with
 * 4+ are pushed down). Lower is better.
 */
function terrainCost(
  terrainByHex: CatanTerrain[],
  variant: CatanVariant,
): number {
  return (
    clusterPenalty(terrainByHex, variant) +
    Math.max(0, adjacentSamePairs(terrainByHex, variant) - FREE_ADJACENT_PAIRS)
  );
}

/** Deserts on `desertIds`, the resources shuffled over the other hexes. */
function layTerrain(
  desertIds: number[],
  rng: () => number,
  variant: CatanVariant,
): CatanTerrain[] {
  const rest = shuffle(nonDesertTerrains(variant), rng);
  const desert = new Set(desertIds);
  const map: CatanTerrain[] = [];
  let ri = 0;

  for (const cell of variant.cells) {
    map[cell.id] = desert.has(cell.id) ? "desert" : rest[ri++];
  }

  return map;
}

/** True when any two of the given hexes are neighbours. */
function anyAdjacent(ids: number[], neighbours: number[][]): boolean {
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (neighbours[ids[i]].includes(ids[j])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Picks the desert hex(es). The base board's single desert honours the
 * centre/ring options; the extension scatters its two deserts anywhere, keeping
 * them apart unless `allowAdjacent`.
 */
function pickDeserts(
  variant: CatanVariant,
  rng: () => number,
  opts: {
    ignore: boolean;
    innerOk: boolean;
    outerOk: boolean;
    allowAdjacent: boolean;
  },
): number[] {
  const count = variant.terrainCounts.desert;
  const eligible = variant.cells
    .filter(cell => {
      if (opts.ignore || variant.id === "extension") {
        return true;
      }

      const ring = ringOf(cell);

      return (
        ring === 0 ||
        (ring === 1 && opts.innerOk) ||
        (ring === 2 && opts.outerOk)
      );
    })
    .map(cell => cell.id);

  const allowAdjacent = opts.allowAdjacent || opts.ignore;
  let picked = shuffle(eligible, rng).slice(0, count);

  if (!allowAdjacent) {
    for (
      let i = 0;
      i < DESERT_ATTEMPTS && anyAdjacent(picked, variant.neighbours);
      i++
    ) {
      picked = shuffle(eligible, rng).slice(0, count);
    }
  }

  return picked;
}

/** An unconstrained shuffle of the tokens onto the numbered hexes. */
function randomNumbers(
  hexIds: number[],
  rng: () => number,
  variant: CatanVariant,
): Map<number, number> {
  const tokens = shuffle([...variant.numberTokens], rng);
  const map = new Map<number, number>();

  hexIds.forEach((id, i) => {
    map.set(id, tokens[i]);
  });

  return map;
}

/**
 * Generates a Catan board. Deterministic for a given `seed` (defaults to a
 * random one). By default: on the base board the desert sits on the centre (the
 * inner/outer ring options open that up); the resources avoid a mono-coloured
 * triangle; and the numbers obey the balance rules with the most evenly-spread
 * candidate kept. `ignoreConstraints` drops all of that for a fully random board.
 */
export function generateCatanBoard(
  seed?: number,
  options?: BoardOptions,
): CatanBoard {
  const variant = variantOf(options?.variant ?? "base");
  const innerOk = options?.desertInnerRing ?? false;
  const outerOk = options?.desertOuterRing ?? false;
  const allowAdjacentDeserts = options?.allowAdjacentDeserts ?? false;
  const ignore = options?.ignoreConstraints ?? false;
  const tolerance = options?.balanceTolerance ?? DEFAULT_TOLERANCE;
  const avoidReds = options?.avoidAdjacentReds ?? true;
  const avoidDuplicates = options?.avoidAdjacentDuplicates ?? true;
  const avoidClusters = options?.avoidResourceClusters ?? true;
  const balanceInter = options?.balanceIntersections ?? true;
  const penalizeVariance = options?.penalizeResourceVariance ?? true;
  const limitPips = options?.limitIntersectionPips ?? true;
  const maxPips = options?.maxIntersectionPips ?? DEFAULT_MAX_PIPS;
  const avoidPortRes = options?.avoidPortOnResource ?? false;
  const terrainN = options?.terrainCandidates ?? TERRAIN_CANDIDATES;
  const numberN = options?.numberCandidates ?? CANDIDATES;
  // A random 32-bit seed when none is given. Uses Web Crypto (not
  // `Math.random`) purely to keep static analysis happy — a board layout has no
  // security relevance either way.
  const actualSeed = seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  const rng = mulberry32(actualSeed);

  const desertIds = pickDeserts(variant, rng, {
    ignore,
    innerOk,
    outerOk,
    allowAdjacent: allowAdjacentDeserts,
  });

  // Terrain: always reject a mono-triangle (unless ignoring). When avoiding
  // clusters, also keep the least-blobby of many layouts; otherwise take the
  // first triangle-free one.
  let terrainByHex: CatanTerrain[];

  if (ignore) {
    terrainByHex = layTerrain(desertIds, rng, variant);
  } else if (avoidClusters) {
    let best = layTerrain(desertIds, rng, variant);
    let bestCost = hasMonoTriangle(best, variant)
      ? Number.POSITIVE_INFINITY
      : terrainCost(best, variant);

    for (let i = 1; i < terrainN; i++) {
      const cand = layTerrain(desertIds, rng, variant);

      if (hasMonoTriangle(cand, variant)) {
        continue;
      }

      const cost = terrainCost(cand, variant);

      if (cost < bestCost) {
        bestCost = cost;
        best = cand;
      }
    }

    terrainByHex = best;
  } else {
    let laid = layTerrain(desertIds, rng, variant);

    for (let i = 0; i < terrainN && hasMonoTriangle(laid, variant); i++) {
      laid = layTerrain(desertIds, rng, variant);
    }

    terrainByHex = laid;
  }

  const hexes: BoardHex[] = variant.cells.map(cell => ({
    id: cell.id,
    q: cell.q,
    r: cell.r,
    terrain: terrainByHex[cell.id],
    number: null,
  }));

  const numberedIds = hexes.filter(h => h.terrain !== "desert").map(h => h.id);

  // Numbers: an unconstrained shuffle when ignoring, else the balanced search.
  let best: Map<number, number>;

  if (ignore) {
    best = randomNumbers(numberedIds, rng, variant);
  } else {
    let candidate: Map<number, number> | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < numberN; i++) {
      const placement = placeNumbers(
        numberedIds,
        rng,
        avoidReds,
        avoidDuplicates,
        variant,
      );

      /* c8 ignore next 3 -- defensive: this constraint set is always solvable */
      if (placement === null) {
        continue;
      }

      const scored = hexes.map(h => ({
        ...h,
        number: placement.get(h.id) ?? null,
      }));
      const score = numberBalance(scored, variant, {
        tolerance,
        balanceIntersections: balanceInter,
        penalizeVariance,
        limitPips,
        maxPips,
      });

      if (score < bestScore) {
        bestScore = score;
        candidate = placement;
      }
    }

    /* c8 ignore next 4 -- unreachable: a valid placement always exists */
    if (candidate === null) {
      candidate =
        placeNumbers(numberedIds, rng, avoidReds, avoidDuplicates, variant) ??
        new Map();
    }

    best = candidate;
  }

  for (const h of hexes) {
    h.number = best.get(h.id) ?? null;
  }

  let portTypes = shuffle(variant.portTypes, rng);

  if (avoidPortRes && !ignore) {
    for (
      let i = 0;
      i < PORT_ATTEMPTS &&
      portTouchesOwnResource(portTypes, terrainByHex, variant);
      i++
    ) {
      portTypes = shuffle(variant.portTypes, rng);
    }
  }

  const ports: BoardPort[] = variant.portSlots.map((slot, i) => ({
    ...slot,
    type: portTypes[i],
  }));

  return { variant: variant.id, hexes, ports, seed: actualSeed };
}
