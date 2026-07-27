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
  axialToPixel,
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
  type SeaCell,
  shuffle,
  type TilePool,
  withIds,
} from "./board";
import {
  bagLandCounts,
  boardTotals,
  boardWidth,
  cellKey,
  fixedSeaCells,
  portCorners,
  type ScenarioBoardSpec,
  type ScenarioSpec,
  type ScenarioZone,
  type SpecCell,
  type SpecPort,
  type SpecPortBag,
  specIssueText,
  validateScenarioSpec,
} from "./scenario-spec";

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
 * that faces a space without land is a candidate, and `land` holds every land
 * space of the whole board, so a zone's coast is measured against its
 * neighbours too.
 *
 * The draw **keeps them apart**, the way the printed boards space theirs around
 * the island: an edge touching a harbour already placed comes last of all — a
 * printed board leaves a free corner between two of them, and the editor
 * refuses to pin them any closer — and among the rest the candidate lying
 * furthest from every harbour placed wins. The first is taken at random. A pure
 * shuffle clumps three of them on one headland often enough to be worth
 * avoiding, and spacing is the one thing a real board never leaves to chance.
 *
 * Nothing stops one tile carrying two, as a published map does: keeping them
 * apart already does that wherever the coast has room. And spacing is a
 * preference, not a rule — a coast too short for what the bag holds keeps its
 * harbours rather than losing them.
 */
export function pickPortSlots(
  cells: HexCell[],
  land: Set<string>,
  count: number,
  rng: () => number,
): PortSlot[] {
  const candidates: Array<{
    slot: PortSlot;
    x: number;
    y: number;
    corners: string[];
  }> = [];

  for (const cell of cells) {
    for (const [dq, dr] of DIRECTIONS) {
      if (land.has(cellKey({ q: cell.q + dq, r: cell.r + dr }))) {
        continue;
      }

      const from = axialToPixel(cell.q, cell.r, 1);
      const to = axialToPixel(cell.q + dq, cell.r + dr, 1);

      candidates.push({
        slot: { hexId: cell.id, dq, dr },
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2,
        corners: portCorners({ q: cell.q, r: cell.r, dq, dr }),
      });
    }
  }

  // Shuffled so that the opening pick — every candidate still infinitely far
  // from a harbour that does not exist yet — is a random one.
  const pool = shuffle(candidates, rng);
  const nearest = pool.map(() => Number.POSITIVE_INFINITY);
  const taken = new Set<number>();
  const corners = new Set<string>();
  const picked: PortSlot[] = [];

  /** Whether candidate `i` would end up corner to corner with one already placed. */
  const touching = (i: number): boolean => {
    return pool[i].corners.some(corner => corners.has(corner));
  };

  /** Free of a neighbour's corner first, then furthest from every harbour. */
  const better = (i: number, best: number): boolean => {
    if (touching(i) !== touching(best)) {
      return !touching(i);
    }

    return nearest[i] > nearest[best];
  };

  /** The best of the candidates still free, or -1 when none of them is. */
  const nextPick = (): number => {
    let best = -1;

    for (let i = 0; i < pool.length; i++) {
      if (taken.has(i)) {
        continue;
      }

      if (best === -1 || better(i, best)) {
        best = i;
      }
    }

    return best;
  };

  /** Takes a candidate, then measures the rest of the coast against it. */
  const place = (best: number): void => {
    taken.add(best);
    picked.push(pool[best].slot);

    for (const corner of pool[best].corners) {
      corners.add(corner);
    }

    for (let i = 0; i < pool.length; i++) {
      const away = Math.hypot(
        pool[i].x - pool[best].x,
        pool[i].y - pool[best].y,
      );

      nearest[i] = Math.min(nearest[i], away);
    }
  };

  while (picked.length < count) {
    const best = nextPick();

    // Not one coastal edge left: the zone keeps fewer harbours than it asked
    // for rather than printing two on the same edge.
    if (best === -1) {
      break;
    }

    place(best);
  }

  return picked;
}

/**
 * Which spaces of a zone end up as land, and which as sea. Nothing is held back
 * for the harbours: a zone whose sea is drawn can pin none, since a harbour needs
 * a coast that is there in every game (see `certaintyMap`).
 */
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

    return {
      land: drawn.slice(0, landCount),
      sea: drawn.slice(landCount),
    };
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
  seaCells: SeaCell[];
  pools: TilePool[];
  /** Zone index → the land cell ids it ended up with (empty for statics). */
  zoneCells: number[][];
}

/**
 * Runs the draw: every zone's sea, then the static tiles on their own spaces.
 * `balanceZones` is the scenario's master switch: with it on, a zone the author
 * gave a margin to hands it to its own bag, so the draw holds that zone in
 * balance as well as the whole board. With it off the margins stay in the spec,
 * unused — the setting is turned back on and they are all there again.
 */
function resolveMap(
  board: ScenarioBoardSpec,
  rng: () => number,
  balanceZones: boolean,
): ResolvedMap {
  const cells: HexCell[] = [];
  const seaCells: SeaCell[] = [];
  const pools: TilePool[] = [];
  const zoneCells: number[][] = [];

  const addLand = (cell: SpecCell): number => {
    cells.push({ id: cells.length, q: cell.q, r: cell.r });

    return cells.length - 1;
  };
  const addSea = (cell: SpecCell, hidden = false): void => {
    seaCells.push({ id: seaCells.length, q: cell.q, r: cell.r, hidden });
  };

  // The board's own sea, laid before anything else and never drawn for: a map
  // authored before those two spaces were fixed keeps them out of its draw.
  const fixed = new Set(fixedSeaCells(boardWidth(board)).map(cellKey));
  const drawn = (cell: SpecCell): boolean => !fixed.has(cellKey(cell));

  fixedSeaCells(boardWidth(board)).forEach(cell => {
    addSea(cell);
  });

  for (const zone of board.zones) {
    const { land, sea } = resolveZone(zone, rng);
    const ids = land.filter(drawn).map(addLand);

    zoneCells.push(ids);

    // A face-down zone hands out face-down water: telling the players where the
    // sea is would map the fog for them, one space at a time.
    sea.filter(drawn).forEach(cell => {
      addSea(cell, zone.hidden ?? false);
    });

    const pool: TilePool = {
      cellIds: ids,
      terrainCounts: bagLandCounts(zone.terrainCounts),
      numberTokens: zone.numberTokens,
      hidden: zone.hidden ?? false,
    };

    if (balanceZones && zone.balanceTolerance !== undefined) {
      pool.balanceTolerance = zone.balanceTolerance / 100;
      pool.label = zone.name;
    }

    pools.push(pool);
  }

  // A static tile is a bag of one: one space, one tile, at most one token — so
  // it needs no special case downstream, it simply has nothing to shuffle.
  for (const tile of board.statics ?? []) {
    if (!drawn(tile.cell)) {
      continue;
    }

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

/**
 * The harbours of a board: those of a zone, pinned where authored and drawn on
 * the zone's own coast otherwise, plus the board's own bag — the ones a printed
 * map sets outside every zone, always pinned.
 */
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

  // A validated spec pins a harbour on land that is land in every draw, so the
  // space it hugs is always one of the map's tiles.
  const pinned = (slot: SpecPort): PortSlot => ({
    hexId: idAt.get(cellKey(slot)) as number,
    dq: slot.dq,
    dr: slot.dr,
  });

  /** One bag's harbours, kept in a pool of their own so their types stay put. */
  const take = (bag: SpecPortBag, drawn: PortSlot[], pool: number): void => {
    for (const slot of drawn) {
      slots.push(slot);
      poolOf.push(pool);
    }

    types.push(...bag.types);
  };

  board.zones.forEach((zone, z) => {
    const bag = zone.ports;

    if (bag === undefined) {
      return;
    }

    const pins = bag.slots ?? [];

    take(
      bag,
      pins.length > 0
        ? pins.map(pinned)
        : pickPortSlots(
            map.zoneCells[z].map(id => map.cells[id]),
            land,
            bag.types.length,
            rng,
          ),
      z,
    );
  });

  if (board.ports !== undefined) {
    // Its own pool, past the last zone's, so a fixed coast's harbours are never
    // shuffled into a zone's.
    take(
      board.ports,
      (board.ports.slots ?? []).map(pinned),
      board.zones.length,
    );
  }

  return { slots, types, poolOf };
}

/**
 * What a Marins board is drawn under unless its caller says otherwise. The base
 * generator hides the harbour rule behind a toggle because its board comes with
 * its harbours printed on; a scenario's are dealt from a bag, so a 2:1 harbour
 * landing on the coast of the very resource it trades is ours to avoid.
 */
export const MARINS_OPTIONS: BoardOptions = { avoidPortOnResource: true };

/** A board drawn from an authored spec, plus the layout it was drawn on. */
export interface SpecBoard {
  players: number;
  /** The authored map this was drawn from. */
  spec: ScenarioBoardSpec;
  board: CatanBoard;
  variant: CatanVariant;
  /**
   * The options it was actually drawn under, `variantSpec` included. Pass them
   * straight to `boardWarnings`: audit a board against anything else and the
   * rules it was held to and the rules it is judged by drift apart.
   */
  options: BoardOptions;
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

  const map = resolveMap(spec, rng, options?.balanceZones ?? false);
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

  const drawnUnder: BoardOptions = {
    ...MARINS_OPTIONS,
    ...options,
    variantSpec: variant,
  };

  return {
    players,
    spec,
    variant,
    options: drawnUnder,
    board: generateCatanBoard(actualSeed, drawnUnder),
  };
}

/** A draw that came out, or the reason it could not. */
export type SpecDraw =
  | { ok: true; drawn: SpecBoard }
  | { ok: false; reason: string };

/**
 * {@link generateSpecBoard} with the throw turned into an answer. A scenario
 * read back from the database is only checked for *shape* on the way in, so a
 * screen that draws one has to be ready to be told no — by a map authored
 * before a rule existed, or asked for a player count it was never drawn for.
 */
export function trySpecBoard(
  scenario: ScenarioSpec,
  players: number,
  seed?: number,
  options?: BoardOptions,
): SpecDraw {
  try {
    return {
      ok: true,
      drawn: generateSpecBoard(scenario, players, seed, options),
    };
  } catch (error) {
    return {
      ok: false,
      /* c8 ignore next -- defensive: the draw only ever throws an Error */
      reason: error instanceof Error ? error.message : "Tirage impossible.",
    };
  }
}
