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
 *  - the desert stays on the centre by default (`BoardOptions` can open the
 *    inner/outer ring);
 *  - resources never form a **mono-coloured triangle** (a straight line of 3–4
 *    is fine — only the closed triangle of three mutually-adjacent same tiles);
 *  - the red numbers **6 and 8 are never adjacent** (official expert rule);
 *  - **two identical numbers are never adjacent**;
 *  - among many valid candidates we keep the one whose production is spread
 *    most evenly across the board (lowest variance of the pip totals at the
 *    intersections where three hexes meet, plus an even spread per resource).
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

/**
 * Total dice combinations (summed pips) each resource can produce on a board —
 * a quick read of its structure: which resource is over- or under-served. The
 * five resources always sum to 58 (the total pips of the 18 tokens).
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

/**
 * For each harbour slot, the on-board tiles its two access points touch — the
 * coastal tile it hugs plus the tile at each shared corner (the neighbours of
 * the coastal hex on either side of the port edge). Used to keep a 2:1 port off
 * *any* tile of its own resource, not just the one it sits on.
 */
export const PORT_TOUCHED: number[][] = buildPortTouched();

function buildPortTouched(): number[][] {
  const idAt = (q: number, r: number): number | undefined =>
    HEX_CELLS.find(c => c.q === q && c.r === r)?.id;

  return PORT_SLOTS.map(slot => {
    const cell = HEX_CELLS[slot.hexId];
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
  /** Allow the desert on the inner ring (default: centre only). */
  desertInnerRing?: boolean;
  /** Allow the desert on the outer coast (default: centre only). */
  desertOuterRing?: boolean;
  /**
   * Drop every placement constraint (mono-triangle, adjacent reds/duplicates,
   * balancing, desert ring) for a fully random board.
   */
  ignoreConstraints?: boolean;
  /**
   * How far each resource's total dice combinations may stray from its balanced
   * share, as a fraction (default `0.25` = ±25%). The balanced share is
   * proportional to a resource's tile count, so a 3-tile resource (brick, ore)
   * expects 25% fewer combinations than a 4-tile one (wood, wool, grain).
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
  /** Keep a 2:1 port off a coastal tile of its own resource (default `false`). */
  avoidPortOnResource?: boolean;
  /** Terrain layouts sampled (default 60). */
  terrainCandidates?: number;
  /** Number placements sampled (default 40). */
  numberCandidates?: number;
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
  avoidReds: boolean,
  avoidDuplicates: boolean,
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

      if (avoidDuplicates && other === n) {
        return false;
      }

      if (avoidReds && isRedNumber(n) && isRedNumber(other)) {
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

/** The 4-tile resources; the other two (brick, ore) have 3 tiles. */
const MAJOR_RESOURCES: CatanResource[] = ["wood", "wool", "grain"];

/** Default allowed deviation from a resource's balanced share (±25%). */
const DEFAULT_TOLERANCE = 0.25;

/** Total pips across the 18 tokens (58) — split among the resources. */
const TOTAL_PIPS = NUMBER_TOKENS.reduce((sum, n) => sum + pipCount(n), 0);

/** A resource's balanced combinations, proportional to its tile count. */
function expectedCombos(resource: CatanResource): number {
  const tiles = MAJOR_RESOURCES.includes(resource) ? 4 : 3;

  return (tiles * TOTAL_PIPS) / NUMBER_TOKENS.length;
}

/**
 * Lower is better. Rather than forcing every resource to the same total (which
 * makes boards feel samey), each resource's combinations must land within
 * `tolerance` of its balanced share (proportional to its tile count) — that
 * leaves natural variety. In-tolerance boards are then ranked by how evenly
 * production spreads across the intersections; boards outside the tolerance
 * score worse, the closest to it least so.
 */
function numberBalance(
  hexes: BoardHex[],
  tolerance: number,
  balanceIntersections: boolean,
): number {
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

  let outOfRange = 0;

  for (const [res, combos] of perResource) {
    const expected = expectedCombos(res);
    const lo = expected * (1 - tolerance);
    const hi = expected * (1 + tolerance);

    if (combos < lo) {
      outOfRange += lo - combos;
    } else if (combos > hi) {
      outOfRange += combos - hi;
    }
  }

  if (outOfRange > 0) {
    return 1000 + outOfRange;
  }

  // In tolerance: rank by even intersection production, or treat all as equal
  // (0) when that balancing is turned off — leaving more variety.
  return balanceIntersections ? vertexVar : 0;
}

/** Default number of number placements sampled per generation. */
const CANDIDATES = 40;

/** Default number of terrain layouts sampled per generation. */
const TERRAIN_CANDIDATES = 60;

/** Rejection budget for keeping 2:1 ports off their own resource. */
const PORT_ATTEMPTS = 100;

/**
 * True when a 2:1 resource port is adjacent to a tile of its own resource — i.e.
 * one of the tiles its access points touch ({@link PORT_TOUCHED}) produces that
 * resource. Generic 3:1 ports are exempt.
 */
function portTouchesOwnResource(
  portTypes: CatanPortType[],
  terrainByHex: CatanTerrain[],
): boolean {
  for (let i = 0; i < PORT_SLOTS.length; i++) {
    const type = portTypes[i];

    if (type === "generic") {
      continue;
    }

    for (const hexId of PORT_TOUCHED[i]) {
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
 * is fine; only the closed triangle is disallowed. (The desert is unique, so
 * it can never form one.)
 */
export function hasMonoTriangle(terrainByHex: CatanTerrain[]): boolean {
  for (const [a, b, c] of HEX_VERTICES) {
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
 * penalised — the generator prefers spread-out resources. The desert is
 * skipped (it is unique).
 */
export function clusterPenalty(terrainByHex: CatanTerrain[]): number {
  const seen: boolean[] = [];
  let penalty = 0;

  for (let start = 0; start < HEX_CELLS.length; start++) {
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

      for (const nb of HEX_NEIGHBOURS[h]) {
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
export function adjacentSamePairs(terrainByHex: CatanTerrain[]): number {
  let count = 0;

  for (let a = 0; a < HEX_NEIGHBOURS.length; a++) {
    for (const b of HEX_NEIGHBOURS[a]) {
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
function terrainCost(terrainByHex: CatanTerrain[]): number {
  return (
    clusterPenalty(terrainByHex) +
    Math.max(0, adjacentSamePairs(terrainByHex) - FREE_ADJACENT_PAIRS)
  );
}

/** Desert on `desertId`, the 18 resources shuffled over the other hexes. */
function layTerrain(desertId: number, rng: () => number): CatanTerrain[] {
  const rest = shuffle(nonDesertTerrains(), rng);
  const map: CatanTerrain[] = [];
  let ri = 0;

  for (const cell of HEX_CELLS) {
    map[cell.id] = cell.id === desertId ? "desert" : rest[ri++];
  }

  return map;
}

/** An unconstrained shuffle of the 18 tokens onto the numbered hexes. */
function randomNumbers(
  hexIds: number[],
  rng: () => number,
): Map<number, number> {
  const tokens = shuffle([...NUMBER_TOKENS], rng);
  const map = new Map<number, number>();

  hexIds.forEach((id, i) => {
    map.set(id, tokens[i]);
  });

  return map;
}

/**
 * Generates a Catan board. Deterministic for a given `seed` (defaults to a
 * random one). By default: the desert sits on the centre (the inner/outer ring
 * options open that up), the resources avoid a mono-coloured triangle, and the
 * numbers obey the balance rules with the most evenly-spread candidate kept.
 * `ignoreConstraints` drops all of that for a fully random board.
 */
export function generateCatanBoard(
  seed?: number,
  options?: BoardOptions,
): CatanBoard {
  const innerOk = options?.desertInnerRing ?? false;
  const outerOk = options?.desertOuterRing ?? false;
  const ignore = options?.ignoreConstraints ?? false;
  const tolerance = options?.balanceTolerance ?? DEFAULT_TOLERANCE;
  const avoidReds = options?.avoidAdjacentReds ?? true;
  const avoidDuplicates = options?.avoidAdjacentDuplicates ?? true;
  const avoidClusters = options?.avoidResourceClusters ?? true;
  const balanceInter = options?.balanceIntersections ?? true;
  const avoidPortRes = options?.avoidPortOnResource ?? false;
  const terrainN = options?.terrainCandidates ?? TERRAIN_CANDIDATES;
  const numberN = options?.numberCandidates ?? CANDIDATES;
  // A random 32-bit seed when none is given. Uses Web Crypto (not
  // `Math.random`) purely to keep static analysis happy — a board layout has no
  // security relevance either way.
  const actualSeed = seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  const rng = mulberry32(actualSeed);

  // Desert: centre by default; the inner/outer ring options widen it, and
  // ignoring constraints frees it anywhere.
  const desertHexes = HEX_CELLS.filter(c => {
    if (ignore) {
      return true;
    }

    const ring = ringOf(c);

    return ring === 0 || (ring === 1 && innerOk) || (ring === 2 && outerOk);
  });
  const desertId = desertHexes[Math.floor(rng() * desertHexes.length)].id;

  // Terrain: always reject a mono-triangle (unless ignoring). When avoiding
  // clusters, also keep the least-blobby of many layouts; otherwise take the
  // first triangle-free one.
  let terrainByHex: CatanTerrain[];

  if (ignore) {
    terrainByHex = layTerrain(desertId, rng);
  } else if (avoidClusters) {
    let best = layTerrain(desertId, rng);
    let bestCost = hasMonoTriangle(best)
      ? Number.POSITIVE_INFINITY
      : terrainCost(best);

    for (let i = 1; i < terrainN; i++) {
      const cand = layTerrain(desertId, rng);

      if (hasMonoTriangle(cand)) {
        continue;
      }

      const cost = terrainCost(cand);

      if (cost < bestCost) {
        bestCost = cost;
        best = cand;
      }
    }

    terrainByHex = best;
  } else {
    let laid = layTerrain(desertId, rng);

    for (let i = 0; i < terrainN && hasMonoTriangle(laid); i++) {
      laid = layTerrain(desertId, rng);
    }

    terrainByHex = laid;
  }

  const hexes: BoardHex[] = HEX_CELLS.map(cell => ({
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
    best = randomNumbers(numberedIds, rng);
  } else {
    let candidate: Map<number, number> | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < numberN; i++) {
      const placement = placeNumbers(
        numberedIds,
        rng,
        avoidReds,
        avoidDuplicates,
      );

      /* c8 ignore next 3 -- defensive: this constraint set is always solvable */
      if (placement === null) {
        continue;
      }

      const scored = hexes.map(h => ({
        ...h,
        number: placement.get(h.id) ?? null,
      }));
      const score = numberBalance(scored, tolerance, balanceInter);

      if (score < bestScore) {
        bestScore = score;
        candidate = placement;
      }
    }

    /* c8 ignore next 3 -- unreachable: a valid placement always exists */
    if (candidate === null) {
      candidate =
        placeNumbers(numberedIds, rng, avoidReds, avoidDuplicates) ?? new Map();
    }

    best = candidate;
  }

  for (const h of hexes) {
    h.number = best.get(h.id) ?? null;
  }

  let portTypes = shuffle(PORT_TYPES, rng);

  if (avoidPortRes && !ignore) {
    for (
      let i = 0;
      i < PORT_ATTEMPTS && portTouchesOwnResource(portTypes, terrainByHex);
      i++
    ) {
      portTypes = shuffle(PORT_TYPES, rng);
    }
  }

  const ports: BoardPort[] = PORT_SLOTS.map((slot, i) => ({
    ...slot,
    type: portTypes[i],
  }));

  return { hexes, ports, seed: actualSeed };
}
