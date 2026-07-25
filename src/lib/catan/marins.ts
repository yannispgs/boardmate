/**
 * Board generation for **Catan - Marins** (Seafarers) scenarios.
 *
 * A Marins map is a *frame* of hex spaces filled with land and sea tiles: the
 * land forms islands, the sea surrounds them, and the harbours sit on the edge
 * between a sea space and a land tile (rulebook: "place it on an edge between a
 * sea hex and a land hex, the token lying on the sea hex, both of its corners
 * touching the land hex") — exactly the {@link PortSlot} the base generator
 * already models.
 *
 * Once the islands are drawn, the terrain and the number tokens are laid by the
 * **base generator** on the land tiles only: because the islands are separate
 * components, its adjacency rules (no two reds side by side, no duplicate
 * neighbours, resource balance) apply per island for free.
 *
 * ⚠️ Scenarios come in two families. **Fully-random** ones ("Le Nouveau Monde")
 * have no printed map — the players build it — so we can generate them end to
 * end. **Fixed-skeleton** ones ("Les quatre îles", "À la découverte de nouveaux
 * rivages"…) have a printed island layout that must be transcribed from the
 * rulebook's map diagram; they are added here as data once that diagram is at
 * hand.
 *
 * Pure and deterministic given a `seed`.
 */

import {
  type BoardOptions,
  buildCatanVariant,
  buildNeighbours,
  type CatanBoard,
  type CatanPortType,
  type CatanTerrain,
  type CatanVariant,
  DIRECTIONS,
  generateCatanBoard,
  type HexCell,
  mulberry32,
  type PortSlot,
  shuffle,
  withIds,
} from "./board";

/** The scenarios this generator can draw. Keys match `extension_scenarios.board_key`. */
export type MarinsScenarioKey = "new-world";

/** A row of the map frame: its `r`, and the `q` range of its spaces. */
export type FrameRow = readonly [r: number, qStart: number, qEnd: number];

/** What comes out of the box for one scenario at one exact player count. */
export interface MarinsComposition {
  /** Every space of the map outline — land and sea together. */
  frame: FrameRow[];
  terrainCounts: Record<CatanTerrain, number>;
  numberTokens: number[];
  portTypes: CatanPortType[];
  /** How many islands the land is split into (inclusive range). */
  islands: readonly [min: number, max: number];
}

export interface MarinsScenario {
  key: MarinsScenarioKey;
  name: string;
  /** The scenario's fixed score to reach — independent of the player count. */
  targetScore: number;
  /** Composition per **exact** player count. */
  compositions: Record<number, MarinsComposition>;
}

/**
 * Our own 42-space outline for "Le Nouveau Monde": 6 rows of 6-7-8-8-7-6, the
 * 19 sea + 23 land tiles the scenario ships with. The scenario has no printed
 * map (the players lay the frame out themselves), so the shape is ours; the
 * tile and token counts are the published ones.
 */
const NEW_WORLD_FRAME: FrameRow[] = [
  [-2, -1, 4],
  [-1, -2, 4],
  [0, -3, 4],
  [1, -4, 3],
  [2, -4, 2],
  [3, -4, 1],
];

/**
 * "Le Nouveau Monde" — 23 land tiles (no desert), 19 sea tiles, 9 harbours,
 * 12 points to win. The published token stack holds 24 tokens for 23 land
 * tiles, so one is left over, which is what the rulebook describes: shuffle the
 * stack, then place **one token per land tile**.
 */
const NEW_WORLD: MarinsComposition = {
  frame: NEW_WORLD_FRAME,
  terrainCounts: {
    fields: 5,
    forest: 5,
    pasture: 5,
    hills: 4,
    mountains: 4,
    desert: 0,
  },
  numberTokens: [
    2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11,
    12,
  ],
  portTypes: [
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
  islands: [3, 5],
};

/** Every scenario the generator can draw, in menu order. */
export const MARINS_SCENARIOS: MarinsScenario[] = [
  {
    key: "new-world",
    name: "Le Nouveau Monde",
    targetScore: 12,
    compositions: { 3: NEW_WORLD, 4: NEW_WORLD },
  },
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

/** The exact player counts a scenario has a composition for, ascending. */
export function marinsPlayerCounts(scenario: MarinsScenario): number[] {
  return Object.keys(scenario.compositions)
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * The player counts a scenario supports, grouped by the composition they share
 * — a rulebook gives "3-4 joueurs" one map and "5-6 joueurs" another, so the
 * picker offers one choice per distinct board rather than one per count.
 */
export function marinsPlayerGroups(scenario: MarinsScenario): number[][] {
  const groups: number[][] = [];

  for (const players of marinsPlayerCounts(scenario)) {
    const previous = groups.at(-1);
    const composition = scenario.compositions[players];

    if (
      previous !== undefined &&
      scenario.compositions[previous[0]] === composition
    ) {
      previous.push(players);
    } else {
      groups.push([players]);
    }
  }

  return groups;
}

/** `3-4 joueurs` / `5 joueurs` — a player group, labelled for the picker. */
export function playerGroupLabel(group: number[]): string {
  const last = group.at(-1);

  return group.length > 1
    ? `${group[0]}-${last} joueurs`
    : `${group[0]} joueur${group[0] > 1 ? "s" : ""}`;
}

/** Land tiles in a composition — one per terrain tile in the box. */
export function landTileCount(composition: MarinsComposition): number {
  return Object.values(composition.terrainCounts).reduce(
    (sum, n) => sum + n,
    0,
  );
}

/** The map outline as hex cells, ids assigned row by row. */
export function frameCells(frame: FrameRow[]): HexCell[] {
  const cells: HexCell[] = [];

  for (const [r, qStart, qEnd] of frame) {
    for (let q = qStart; q <= qEnd; q++) {
      cells.push({ id: 0, q, r });
    }
  }

  return withIds(cells);
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
 * Hops from every land space to each space of the frame — `Infinity` while no
 * land has been laid yet. Used to drop the next island as far from the others
 * as the frame allows.
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
 * Grows `total` land tiles inside a frame as separate islands of the given
 * `sizes`. Every island is **seeded first**, each as far from the previous ones
 * as the frame allows, then they grow one tile at a time in turn onto
 * neighbours that touch no other island — so islands stay apart and none is
 * boxed in by a greedier one. Whatever land is still in hand once every island
 * is full (or blocked) is laid along an existing coast, which may join two
 * islands: a map short of land would be worse than a merged one. Returns the
 * land space ids, ascending.
 *
 * `total` must not exceed the number of spaces in the frame.
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
 * Spreads `count` harbours over the coastline: every land tile edge that faces
 * a space without land is a candidate, and at most one harbour lands on a given
 * tile. Falls back to doubling up on a tile only when the coast has fewer tiles
 * than harbours.
 */
export function pickPortSlots(
  cells: HexCell[],
  neighbours: number[][],
  count: number,
  rng: () => number,
): PortSlot[] {
  const candidates: PortSlot[] = [];

  for (const cell of cells) {
    for (const [dq, dr] of DIRECTIONS) {
      const inland = neighbours[cell.id].some(
        n => cells[n].q === cell.q + dq && cells[n].r === cell.r + dr,
      );

      if (!inland) {
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

/** A generated Marins board plus the one-off layout it was drawn on. */
export interface MarinsBoard {
  scenario: MarinsScenario;
  players: number;
  board: CatanBoard;
  /** Pass this back to `boardWarnings` to audit the board. */
  variant: CatanVariant;
}

/**
 * Draws a scenario's map for an exact player count: the islands first, then the
 * harbours along their coasts, then the terrain and number tokens through the
 * base generator. Deterministic for a given `seed`.
 */
export function generateMarinsBoard(
  key: MarinsScenarioKey,
  players: number,
  seed?: number,
  options?: BoardOptions,
): MarinsBoard {
  const scenario = marinsScenario(key);
  const composition = scenario.compositions[players];

  if (composition === undefined) {
    throw new Error(
      `« ${scenario.name} » n'a pas de plateau pour ${players} joueurs.`,
    );
  }

  // A random 32-bit seed when none is given (Web Crypto, as in the base
  // generator — a board layout has no security relevance either way).
  const actualSeed = seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  const rng = mulberry32(actualSeed);

  const frame = frameCells(composition.frame);
  const [minIslands, maxIslands] = composition.islands;
  const count = minIslands + Math.floor(rng() * (maxIslands - minIslands + 1));
  const land = growIslands(
    buildNeighbours(frame),
    landTileCount(composition),
    islandSizes(landTileCount(composition), count, rng),
    rng,
  );

  const isLand = new Set(land);
  const cells = withIds(
    land.map(id => ({ id: 0, q: frame[id].q, r: frame[id].r })),
  );
  const seaCells = withIds(
    frame.filter(c => !isLand.has(c.id)).map(c => ({ id: 0, q: c.q, r: c.r })),
  );

  const variant = buildCatanVariant({
    id: "marins",
    cells,
    seaCells,
    terrainCounts: composition.terrainCounts,
    numberTokens: composition.numberTokens,
    portTypes: composition.portTypes,
    portSlots: pickPortSlots(
      cells,
      buildNeighbours(cells),
      composition.portTypes.length,
      rng,
    ),
  });

  return {
    scenario,
    players,
    variant,
    board: generateCatanBoard(actualSeed, { ...options, variantSpec: variant }),
  };
}
