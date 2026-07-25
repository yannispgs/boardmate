/**
 * Board generation for **Catan - Marins** (Seafarers) scenarios.
 *
 * A Marins map is a canvas of hex spaces filled with land and sea tiles: the
 * land forms islands, the sea surrounds them, and the harbours sit on the edge
 * between a sea space and a land tile (rulebook: "place it on an edge between a
 * sea hex and a land hex, the token lying on the sea hex, both of its corners
 * touching the land hex") — exactly the {@link PortSlot} the base generator
 * already models.
 *
 * What a scenario holds is **authored data**, not code: a {@link ScenarioSpec}
 * paints zones (a set of spaces plus the bag that fills them) and static tiles
 * onto the canvas, and this module turns one into a board. Drawing it goes:
 *
 *  1. **resolve the map** — each zone hands out its sea, either as grown islands
 *     when it asks for them or wherever the shuffle drops it; static tiles take
 *     their fixed space;
 *  2. **place the harbours** — pinned where the author pinned them, spread along
 *     the drawn coast otherwise;
 *  3. **fill the land** — the terrain and the number tokens are laid by the
 *     **base generator**, one bag per zone: because the islands are separate
 *     components, its adjacency rules (no two reds side by side, no duplicate
 *     neighbours, resource balance) apply per island for free.
 *
 * Pure and deterministic given a `seed`.
 */

import {
  type BoardOptions,
  buildCatanVariant,
  buildNeighbours,
  type CatanBoard,
  type CatanPortType,
  type CatanVariant,
  DIRECTIONS,
  generateCatanBoard,
  type HexCell,
  mulberry32,
  type PortSlot,
  shuffle,
  type TilePool,
  withIds,
} from "./board";
import {
  bagLandCounts,
  boardTotals,
  cellKey,
  type ScenarioBoardSpec,
  type ScenarioSpec,
  type ScenarioZone,
  type SpecCell,
  specIssueText,
  validateScenarioSpec,
} from "./scenario-spec";

/** The scenarios this generator ships with. Keys match `board_key`. */
export type MarinsScenarioKey = "new-world";

/** A scenario the generator can draw, behind the key the app stores. */
export interface MarinsScenario {
  key: MarinsScenarioKey;
  spec: ScenarioSpec;
}

/**
 * "Le Nouveau Monde" — 23 land tiles (no desert), 19 sea tiles, 9 harbours,
 * 12 points to win, over a 42-space canvas of 6-7-8-8-7-6.
 *
 * ⚠️ The scenario has **no printed map**: the players lay the frame out
 * themselves and everything is drawn, so the outline below is **ours** and the
 * UI says so. Only the tile and harbour counts are the published ones; the token
 * bag is trimmed to exactly one per producing tile, since a bag has to hold as
 * many tokens as tiles that carry one.
 */
const NEW_WORLD: ScenarioSpec = {
  name: "Le Nouveau Monde",
  targetScore: 12,
  boards: [
    {
      players: [3, 4],
      zones: [
        {
          name: "Archipel",
          cells: canvasCells([
            [0, -1, 4],
            [1, -2, 4],
            [2, -3, 4],
            [3, -4, 3],
            [4, -4, 2],
            [5, -4, 1],
          ]),
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

/** Every scenario the generator ships with, in menu order. */
export const MARINS_SCENARIOS: MarinsScenario[] = [
  { key: "new-world", spec: NEW_WORLD },
];

/** The scenario behind a key. */
export function marinsScenario(key: MarinsScenarioKey): MarinsScenario {
  const found = MARINS_SCENARIOS.find(s => s.key === key);

  /* c8 ignore next 3 -- unreachable: the key type only admits known scenarios */
  if (found === undefined) {
    throw new Error(`Scénario Marins inconnu : ${key}`);
  }

  return found;
}

/** A row of a canvas outline: its `r`, and the `q` range of its spaces. */
export type CanvasRow = readonly [r: number, qStart: number, qEnd: number];

/** Expands an outline given row by row into the spaces it covers. */
export function canvasCells(rows: readonly CanvasRow[]): SpecCell[] {
  const cells: SpecCell[] = [];

  for (const [r, qStart, qEnd] of rows) {
    for (let q = qStart; q <= qEnd; q++) {
      cells.push({ q, r });
    }
  }

  return cells;
}

/** The player counts a scenario has a map for, grouped by shared map. */
export function marinsPlayerGroups(spec: ScenarioSpec): number[][] {
  return spec.boards.map(board => [...board.players].sort((a, b) => a - b));
}

/** `3-4 joueurs` / `5 joueurs` — a player group, labelled for the picker. */
export function playerGroupLabel(group: number[]): string {
  const last = group.at(-1);

  return group.length > 1
    ? `${group[0]}-${last} joueurs`
    : `${group[0]} joueur${group[0] > 1 ? "s" : ""}`;
}

/** The map a scenario uses at an exact player count. */
export function marinsBoardFor(
  spec: ScenarioSpec,
  players: number,
): ScenarioBoardSpec | undefined {
  return spec.boards.find(board => board.players.includes(players));
}

/** Smallest island the generator will lay down — a lone tile is no island. */
const MIN_ISLAND = 2;

/**
 * Splits `total` land tiles across `count` islands, each at least
 * {@link MIN_ISLAND} tiles. The extra tiles are dropped on a squared-random
 * index, which biases them towards the first island — so a map usually gets one
 * main island and a few smaller ones rather than equal blobs. `total` must
 * cover the minimum for every island.
 */
export function islandSizes(
  total: number,
  count: number,
  rng: () => number,
): number[] {
  const sizes = new Array<number>(count).fill(MIN_ISLAND);

  for (let left = total - count * MIN_ISLAND; left > 0; left--) {
    sizes[Math.floor(rng() * rng() * count)] += 1;
  }

  return sizes;
}

/** Picks one of `pool` at random. */
function pick(pool: number[], rng: () => number): number {
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Hops from every land space to each space of the canvas — `Infinity` while no
 * land has been laid yet. Used to drop the next island as far from the others
 * as the canvas allows.
 */
function hopsToLand(neighbours: number[][], land: Set<number>): number[] {
  const hops = neighbours.map(() => Number.POSITIVE_INFINITY);
  const queue = [...land];

  for (const id of queue) {
    hops[id] = 0;
  }

  for (let i = 0; i < queue.length; i++) {
    for (const n of neighbours[queue[i]]) {
      if (hops[n] === Number.POSITIVE_INFINITY) {
        hops[n] = hops[queue[i]] + 1;
        queue.push(n);
      }
    }
  }

  return hops;
}

/**
 * Grows `total` land tiles inside a zone as separate islands of the given
 * `sizes`. Every island is **seeded first**, each as far from the previous ones
 * as the space allows, then they grow one tile at a time in turn onto
 * neighbours that touch no other island — so islands stay apart and none is
 * boxed in by a greedier one. Whatever land is still in hand once every island
 * is full (or blocked) is laid along an existing coast, which may join two
 * islands: a map short of land would be worse than a merged one. Returns the
 * land space ids, ascending.
 *
 * `total` must not exceed the number of spaces available.
 */
export function growIslands(
  neighbours: number[][],
  total: number,
  sizes: number[],
  rng: () => number,
): number[] {
  const spaces = neighbours.map((_, id) => id);
  const owner = new Map<number, number>();
  const free = (id: number): boolean => !owner.has(id);
  const taken = (id: number): boolean => owner.has(id);
  const grown: number[] = [];

  for (const _size of sizes) {
    if (owner.size >= total) {
      break;
    }

    const hops = hopsToLand(neighbours, new Set(owner.keys()));
    const seeds = spaces.filter(id => free(id) && hops[id] > 1);

    if (seeds.length === 0) {
      break;
    }

    const furthest = Math.max(...seeds.map(id => hops[id]));

    owner.set(
      pick(
        seeds.filter(id => hops[id] === furthest),
        rng,
      ),
      grown.length,
    );
    grown.push(1);
  }

  for (
    let pass = 0;
    pass < Math.max(0, ...sizes) && owner.size < total;
    pass++
  ) {
    for (
      let island = 0;
      island < grown.length && owner.size < total;
      island++
    ) {
      if (grown[island] >= sizes[island]) {
        continue;
      }

      const candidates = spaces.filter(
        id =>
          free(id) &&
          neighbours[id].some(n => owner.get(n) === island) &&
          !neighbours[id].some(n => taken(n) && owner.get(n) !== island),
      );

      if (candidates.length === 0) {
        continue;
      }

      owner.set(pick(candidates, rng), island);
      grown[island] += 1;
    }
  }

  // Short of land: extend an existing coast, or — if every coast is landlocked
  // — drop the tile on any free space.
  while (owner.size < total) {
    const coastal = spaces.filter(id => free(id) && neighbours[id].some(taken));
    const pool = coastal.length > 0 ? coastal : spaces.filter(free);

    owner.set(pick(pool, rng), grown.length);
  }

  return [...owner.keys()].sort((a, b) => a - b);
}

/**
 * Spreads `count` harbours over the coastline of `cells`: every edge of theirs
 * that faces a space without land is a candidate, and at most one harbour lands
 * on a given tile. Falls back to doubling up on a tile only when the coast has
 * fewer tiles than harbours. `land` holds every land space of the whole board,
 * so a zone's coast is measured against its neighbours too.
 */
export function pickPortSlots(
  cells: HexCell[],
  land: Set<string>,
  count: number,
  rng: () => number,
): PortSlot[] {
  const candidates: PortSlot[] = [];

  for (const cell of cells) {
    for (const [dq, dr] of DIRECTIONS) {
      if (!land.has(cellKey({ q: cell.q + dq, r: cell.r + dr }))) {
        candidates.push({ hexId: cell.id, dq, dr });
      }
    }
  }

  const used = new Set<number>();
  const picked: PortSlot[] = [];
  const spare: PortSlot[] = [];

  for (const slot of shuffle(candidates, rng)) {
    if (picked.length < count && !used.has(slot.hexId)) {
      used.add(slot.hexId);
      picked.push(slot);
    } else {
      spare.push(slot);
    }
  }

  return [...picked, ...spare.slice(0, count - picked.length)];
}

/** Which spaces of a zone end up as land, and which as sea. */
function resolveZone(
  zone: ScenarioZone,
  rng: () => number,
): { land: SpecCell[]; sea: SpecCell[] } {
  const seaCount = zone.terrainCounts.sea ?? 0;

  if (seaCount === 0) {
    return { land: zone.cells, sea: [] };
  }

  const landCount = zone.cells.length - seaCount;

  if (zone.islands === undefined) {
    const drawn = shuffle(zone.cells, rng);

    return { land: drawn.slice(0, landCount), sea: drawn.slice(landCount) };
  }

  const spaces = withIds(zone.cells.map(c => ({ id: 0, q: c.q, r: c.r })));
  const [min, max] = zone.islands;
  const islands = min + Math.floor(rng() * (max - min + 1));
  const grown = new Set(
    growIslands(
      buildNeighbours(spaces),
      landCount,
      islandSizes(landCount, islands, rng),
      rng,
    ),
  );

  return {
    land: spaces.filter(c => grown.has(c.id)).map(c => ({ q: c.q, r: c.r })),
    sea: spaces.filter(c => !grown.has(c.id)).map(c => ({ q: c.q, r: c.r })),
  };
}

/** The map once the draw has settled: where the land, the sea and the bags are. */
interface ResolvedMap {
  cells: HexCell[];
  seaCells: HexCell[];
  pools: TilePool[];
  /** Zone index → the land cell ids it ended up with (empty for statics). */
  zoneCells: number[][];
}

/** Runs the draw: every zone's sea, then the static tiles on their own spaces. */
function resolveMap(board: ScenarioBoardSpec, rng: () => number): ResolvedMap {
  const cells: HexCell[] = [];
  const seaCells: HexCell[] = [];
  const pools: TilePool[] = [];
  const zoneCells: number[][] = [];

  const addLand = (cell: SpecCell): number => {
    cells.push({ id: cells.length, q: cell.q, r: cell.r });

    return cells.length - 1;
  };
  const addSea = (cell: SpecCell): void => {
    seaCells.push({ id: seaCells.length, q: cell.q, r: cell.r });
  };

  for (const zone of board.zones) {
    const { land, sea } = resolveZone(zone, rng);
    const ids = land.map(addLand);

    zoneCells.push(ids);
    sea.forEach(addSea);
    pools.push({
      cellIds: ids,
      terrainCounts: bagLandCounts(zone.terrainCounts),
      numberTokens: zone.numberTokens,
      hidden: zone.hidden ?? false,
    });
  }

  // A static tile is a bag of one: one space, one tile, at most one token — so
  // it needs no special case downstream, it simply has nothing to shuffle.
  for (const tile of board.statics ?? []) {
    if (tile.terrain === "sea") {
      addSea(tile.cell);
      continue;
    }

    pools.push({
      cellIds: [addLand(tile.cell)],
      terrainCounts: bagLandCounts({ [tile.terrain]: 1 }),
      numberTokens: tile.number === undefined ? [] : [tile.number],
      hidden: false,
    });
  }

  return { cells, seaCells, pools, zoneCells };
}

/** The harbours of every zone: pinned where authored, drawn on the coast else. */
function resolvePorts(
  board: ScenarioBoardSpec,
  map: ResolvedMap,
  rng: () => number,
): { slots: PortSlot[]; types: CatanPortType[]; poolOf: number[] } {
  const land = new Set(map.cells.map(cellKey));
  const idAt = new Map(map.cells.map(cell => [cellKey(cell), cell.id]));
  const slots: PortSlot[] = [];
  const types: CatanPortType[] = [];
  const poolOf: number[] = [];

  board.zones.forEach((zone, z) => {
    const bag = zone.ports;

    if (bag === undefined) {
      return;
    }

    const pinned = bag.slots ?? [];
    const drawn =
      pinned.length > 0
        ? pinned.map(slot => ({
            hexId: idAt.get(cellKey(slot)) as number,
            dq: slot.dq,
            dr: slot.dr,
          }))
        : pickPortSlots(
            map.zoneCells[z].map(id => map.cells[id]),
            land,
            bag.types.length,
            rng,
          );

    for (const slot of drawn) {
      slots.push(slot);
      poolOf.push(z);
    }

    types.push(...bag.types);
  });

  return { slots, types, poolOf };
}

/** A board drawn from an authored spec, plus the layout it was drawn on. */
export interface SpecBoard {
  players: number;
  /** The authored map this was drawn from. */
  spec: ScenarioBoardSpec;
  board: CatanBoard;
  /** Pass this back to `boardWarnings` to audit the board. */
  variant: CatanVariant;
}

/** A generated board of one of the scenarios the generator ships with. */
export interface MarinsBoard extends SpecBoard {
  scenario: MarinsScenario;
}

/**
 * Draws an authored scenario's map for an exact player count — the entry point
 * the editor previews with and the one a scenario read back from the database
 * goes through. Throws when the scenario does not add up
 * ({@link validateScenarioSpec}) or has no map for that many players.
 * Deterministic for a given `seed`.
 */
export function generateSpecBoard(
  scenario: ScenarioSpec,
  players: number,
  seed?: number,
  options?: BoardOptions,
): SpecBoard {
  const issues = validateScenarioSpec(scenario);

  if (issues.length > 0) {
    throw new Error(
      `« ${scenario.name} » est incohérent : ${issues.map(specIssueText).join(" ")}`,
    );
  }

  const spec = marinsBoardFor(scenario, players);

  if (spec === undefined) {
    throw new Error(
      `« ${scenario.name} » n'a pas de plateau pour ${players} joueurs.`,
    );
  }

  // A random 32-bit seed when none is given (Web Crypto, as in the base
  // generator — a board layout has no security relevance either way).
  const actualSeed = seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  const rng = mulberry32(actualSeed);

  const map = resolveMap(spec, rng);
  const ports = resolvePorts(spec, map, rng);
  const totals = boardTotals(spec);

  const variant = buildCatanVariant({
    id: "marins",
    cells: map.cells,
    seaCells: map.seaCells,
    terrainCounts: totals.terrainCounts,
    numberTokens: totals.numberTokens,
    pools: map.pools,
    portTypes: ports.types,
    portSlots: ports.slots,
    portPoolOf: ports.poolOf,
  });

  return {
    players,
    spec,
    variant,
    board: generateCatanBoard(actualSeed, { ...options, variantSpec: variant }),
  };
}

/** Draws one of the built-in scenarios, behind the key the app stores. */
export function generateMarinsBoard(
  key: MarinsScenarioKey,
  players: number,
  seed?: number,
  options?: BoardOptions,
): MarinsBoard {
  const scenario = marinsScenario(key);

  return {
    scenario,
    ...generateSpecBoard(scenario.spec, players, seed, options),
  };
}
