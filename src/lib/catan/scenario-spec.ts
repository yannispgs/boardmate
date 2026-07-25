/**
 * The **authored** description of a Catan - Marins scenario — what the scenario
 * editor produces and the generator draws from.
 *
 * A scenario board is always the same shape: seven rows holding `N`, `N+1`,
 * `N+2`, `N+3`, `N+2`, `N+1`, `N` spaces, centred on one another. Only `N`
 * changes from one scenario or player count to the next. The author never
 * draws that outline, only paints inside it:
 *
 *  - **zones** — a set of spaces plus the bag that fills them. One notion covers
 *    the three the rulebook uses: a bag of nothing but `sea` freezes a stretch of
 *    ocean, a bag without any `sea` fixes an island's outline while its tiles
 *    still move from game to game, and a bag holding both leaves the whole area
 *    to chance. A zone may also carry a bag of harbours, and may be laid face
 *    down (the fog island).
 *  - **static tiles** — one space, one terrain, optionally one token, identical
 *    in every game.
 *
 * The format is deliberately declarative: everything the generator needs is
 * data, so a new scenario is authored rather than coded. Whatever the author
 * paints must still add up — see {@link validateScenarioSpec}.
 */

import type { CatanPortType, CatanTerrain } from "./board";

/** Every scenario board is seven rows deep; only its width changes. */
export const BOARD_ROWS = 7;

/** Spaces each row holds beyond the board's width, top row first. */
const ROW_BULGE = [0, 1, 2, 3, 2, 1, 0];

/**
 * How narrow and how wide a map gets. The smallest published maps — the three
 * player ones — sit at 4; the floor is one below that so a two-player variant,
 * should one turn up, has somewhere to go. The ceiling is the largest Marins
 * map with a little room to spare.
 */
export const MIN_WIDTH = 3;
export const MAX_WIDTH = 10;

/** The width a board is drawn at when it does not say. */
export const DEFAULT_WIDTH = 6;

/** A space on the canvas, in axial coordinates (`r` = row, `q` = column). */
export interface SpecCell {
  q: number;
  r: number;
}

/** The width a board is drawn at. */
export function boardWidth(board: ScenarioBoardSpec): number {
  return board.width ?? DEFAULT_WIDTH;
}

/** Where row `r` starts and how many spaces it holds, on a board `width` wide. */
export function rowSpan(
  width: number,
  r: number,
): { start: number; count: number } {
  // Each row is pushed half a space left of the one above by the hex grid
  // itself, and the bulging rows need half of their extra spaces back on the
  // left to stay centred. Subtracted rather than negated: `-0` would travel
  // into the stored spec. `r + ROW_BULGE[r]` is always even, so this is whole.
  const start = 0 - (r + ROW_BULGE[r]) / 2;

  return { start, count: width + ROW_BULGE[r] };
}

/** Every space of a board `width` wide, row by row. */
export function boardOutline(width: number): SpecCell[] {
  const cells: SpecCell[] = [];

  for (let r = 0; r < BOARD_ROWS; r++) {
    const { start, count } = rowSpan(width, r);

    for (let q = start; q < start + count; q++) {
      cells.push({ q, r });
    }
  }

  return cells;
}

/** Whether a space falls on a board `width` wide. */
export function isInsideBoard(width: number, cell: SpecCell): boolean {
  if (cell.r < 0 || cell.r >= BOARD_ROWS) {
    return false;
  }

  const { start, count } = rowSpan(width, cell.r);

  return cell.q >= start && cell.q < start + count;
}

/** The narrowest board that still holds everything painted on this one. */
export function minimumWidth(cells: SpecCell[]): number {
  let width = MIN_WIDTH;

  for (const cell of cells) {
    if (cell.r < 0 || cell.r >= BOARD_ROWS) {
      continue;
    }

    const { start } = rowSpan(0, cell.r);

    // How wide row `r` must be for `q` to fall in it, undoing the bulge.
    width = Math.max(width, cell.q - start + 1 - ROW_BULGE[cell.r]);
  }

  return Math.min(width, MAX_WIDTH);
}

/** What a space can hold: a land tile, or open sea. */
export type SpecTerrain = CatanTerrain | "sea";

/**
 * A harbour: the land space it hugs plus the direction of the edge it sits on —
 * the token itself lies on the sea space beyond that edge.
 */
export interface SpecPort extends SpecCell {
  dq: number;
  dr: number;
}

/** A bag of harbours: where they sit, and which ones are in the box. */
export interface SpecPortBag {
  /**
   * The edges they sit on — the author's call, never the players'. A harbour
   * needs a coast, so pinning one **forces its space to be land**, even in a
   * zone that otherwise draws its sea. Left empty only on a scenario with no
   * printed map, where the harbours follow whatever coast the game rolls.
   */
  slots?: SpecPort[];
  types: CatanPortType[];
}

/**
 * A painted area and the bag that fills it. Tiles and tokens are dealt at
 * random inside the zone, so the author fixes *what* it holds, not *where*.
 */
export interface ScenarioZone {
  name: string;
  cells: SpecCell[];
  /** The tiles in the bag — one per space, `sea` included. */
  terrainCounts: Partial<Record<SpecTerrain, number>>;
  /** The tokens in the bag — one per tile that carries one. */
  numberTokens: number[];
  /** Lay the zone's tiles face down (the fog island). */
  hidden?: boolean;
  /**
   * How many islands the zone's land should form. Only meaningful when the bag
   * holds sea: without it the land falls where the shuffle drops it, with it the
   * generator grows proper islands instead of a scattering of lone tiles.
   */
  islands?: readonly [min: number, max: number];
  ports?: SpecPortBag;
}

/** A space whose terrain — and sometimes token — is the same in every game. */
export interface StaticTile {
  cell: SpecCell;
  terrain: SpecTerrain;
  /** Fixed token; omitted on a desert, on the sea, or on a tile left blank. */
  number?: number;
}

/** One board of a scenario: the map used at the given player counts. */
export interface ScenarioBoardSpec {
  /** The exact player counts this map is used at (the rulebook groups them). */
  players: number[];
  /**
   * `N`, the width of the map's narrowest rows — the only thing that changes
   * from one map to the next. Absent on a board authored before the outline
   * was fixed, which reads as {@link DEFAULT_WIDTH}.
   */
  width?: number;
  zones: ScenarioZone[];
  statics?: StaticTile[];
}

/** A scenario: its name, its fixed score to reach, and a map per player count. */
export interface ScenarioSpec {
  name: string;
  /** The scenario's score to reach — independent of the player count. */
  targetScore: number;
  boards: ScenarioBoardSpec[];
}

/** Tokens a bag may hold: 2–12, never 7. */
export function isValidToken(n: number): boolean {
  return Number.isInteger(n) && n >= 2 && n <= 12 && n !== 7;
}

/** Tiles in a bag, sea included — one is needed per space of the zone. */
export function bagTileCount(
  terrainCounts: Partial<Record<SpecTerrain, number>>,
): number {
  return Object.values(terrainCounts).reduce((sum, n) => sum + (n ?? 0), 0);
}

/**
 * Tiles of a bag that carry a number token — everything but the deserts and the
 * sea, the gold river included.
 */
export function tokenBearingCount(
  terrainCounts: Partial<Record<SpecTerrain, number>>,
): number {
  return (
    bagTileCount(terrainCounts) -
    (terrainCounts.sea ?? 0) -
    (terrainCounts.desert ?? 0)
  );
}

/** The land tiles a bag holds, by terrain — the sea left out. */
export function bagLandCounts(
  terrainCounts: Partial<Record<SpecTerrain, number>> = {},
): Record<CatanTerrain, number> {
  const land: Record<CatanTerrain, number> = {
    forest: 0,
    pasture: 0,
    fields: 0,
    hills: 0,
    mountains: 0,
    gold: 0,
    desert: 0,
  };

  for (const terrain of Object.keys(land) as CatanTerrain[]) {
    land[terrain] = terrainCounts[terrain] ?? 0;
  }

  return land;
}

/** What a board adds up to, for the recap and for the generator's own totals. */
export function boardTotals(board: ScenarioBoardSpec): {
  land: number;
  sea: number;
  ports: number;
  terrainCounts: Record<CatanTerrain, number>;
  numberTokens: number[];
} {
  const terrainCounts = bagLandCounts();
  const numberTokens: number[] = [];
  let sea = 0;
  let ports = 0;

  for (const zone of board.zones) {
    const land = bagLandCounts(zone.terrainCounts);

    for (const terrain of Object.keys(land) as CatanTerrain[]) {
      terrainCounts[terrain] += land[terrain];
    }

    sea += zone.terrainCounts.sea ?? 0;
    ports += zone.ports?.types.length ?? 0;
    numberTokens.push(...zone.numberTokens);
  }

  for (const tile of board.statics ?? []) {
    if (tile.terrain === "sea") {
      sea += 1;
    } else {
      terrainCounts[tile.terrain] += 1;
    }

    if (tile.number !== undefined) {
      numberTokens.push(tile.number);
    }
  }

  const land = Object.values(terrainCounts).reduce((sum, n) => sum + n, 0);

  return { land, sea, ports, terrainCounts, numberTokens };
}

/** Something in an authored scenario that does not add up. */
export type SpecIssue =
  | { kind: "no-boards" }
  | { kind: "no-players"; board: number }
  | { kind: "duplicate-players"; board: number; players: number }
  | { kind: "empty-zone"; board: number; zone: number; name: string }
  | { kind: "off-board"; board: number; cell: SpecCell }
  | { kind: "overlap"; board: number; cell: SpecCell }
  | {
      kind: "tile-count";
      board: number;
      zone: number;
      name: string;
      tiles: number;
      cells: number;
    }
  | {
      kind: "token-count";
      board: number;
      zone: number;
      name: string;
      tokens: number;
      needed: number;
    }
  | { kind: "bad-token"; board: number; where: string; token: number }
  | { kind: "static-token"; board: number; cell: SpecCell }
  | {
      kind: "port-count";
      board: number;
      zone: number;
      name: string;
      types: number;
      slots: number;
    }
  | {
      kind: "port-over-land";
      board: number;
      zone: number;
      name: string;
      spaces: number;
      land: number;
    }
  | {
      kind: "port-off-zone";
      board: number;
      zone: number;
      name: string;
      cell: SpecCell;
    };

/** `q,r` — the key a space is indexed by. */
export function cellKey(cell: SpecCell): string {
  return `${cell.q},${cell.r}`;
}

/** Collects the issues of one board of a scenario. */
function boardIssues(board: ScenarioBoardSpec, index: number): SpecIssue[] {
  const issues: SpecIssue[] = [];
  const claimed = new Set<string>();

  if (board.players.length === 0) {
    issues.push({ kind: "no-players", board: index });
  }

  const width = boardWidth(board);

  const claim = (cell: SpecCell): void => {
    if (!isInsideBoard(width, cell)) {
      issues.push({ kind: "off-board", board: index, cell });
    }

    if (claimed.has(cellKey(cell))) {
      issues.push({ kind: "overlap", board: index, cell });
    }

    claimed.add(cellKey(cell));
  };

  board.zones.forEach((zone, z) => {
    const shared = { board: index, zone: z, name: zone.name };

    for (const cell of zone.cells) {
      claim(cell);
    }

    if (zone.cells.length === 0) {
      issues.push({ kind: "empty-zone", ...shared });
    }

    const tiles = bagTileCount(zone.terrainCounts);

    if (tiles !== zone.cells.length) {
      issues.push({
        kind: "tile-count",
        ...shared,
        tiles,
        cells: zone.cells.length,
      });
    }

    const needed = tokenBearingCount(zone.terrainCounts);

    if (zone.numberTokens.length !== needed) {
      issues.push({
        kind: "token-count",
        ...shared,
        tokens: zone.numberTokens.length,
        needed,
      });
    }

    for (const token of zone.numberTokens) {
      if (!isValidToken(token)) {
        issues.push({
          kind: "bad-token",
          board: index,
          where: zone.name,
          token,
        });
      }
    }

    issues.push(...portIssues(zone, shared));
  });

  for (const tile of board.statics ?? []) {
    claim(tile.cell);

    if (tile.number === undefined) {
      continue;
    }

    if (!isValidToken(tile.number)) {
      issues.push({
        kind: "bad-token",
        board: index,
        where: `case ${cellKey(tile.cell)}`,
        token: tile.number,
      });
    }

    if (tile.terrain === "sea" || tile.terrain === "desert") {
      issues.push({ kind: "static-token", board: index, cell: tile.cell });
    }
  }

  return issues;
}

/**
 * The harbour bag of a zone: one slot per harbour, all of them inside the zone,
 * and never more coast pinned than the zone has land to give — a pinned harbour
 * forces its space to be land, so it competes with the zone's sea.
 */
function portIssues(
  zone: ScenarioZone,
  shared: { board: number; zone: number; name: string },
): SpecIssue[] {
  const slots = zone.ports?.slots ?? [];
  const types = zone.ports?.types ?? [];
  const issues: SpecIssue[] = [];

  if (slots.length === 0) {
    return issues;
  }

  if (slots.length !== types.length) {
    issues.push({
      kind: "port-count",
      ...shared,
      types: types.length,
      slots: slots.length,
    });
  }

  const own = new Set(zone.cells.map(cellKey));
  const hosts = new Set<string>();

  for (const slot of slots) {
    hosts.add(cellKey(slot));

    if (!own.has(cellKey(slot))) {
      issues.push({ kind: "port-off-zone", ...shared, cell: slot });
    }
  }

  const land = zone.cells.length - (zone.terrainCounts.sea ?? 0);

  if (hosts.size > land) {
    issues.push({
      kind: "port-over-land",
      ...shared,
      spaces: hosts.size,
      land,
    });
  }

  return issues;
}

/**
 * Everything that does not add up in an authored scenario — an empty list means
 * the generator can draw it. The two rules that bite in practice: a zone's bag
 * must hold exactly one tile per space, and exactly one token per tile that
 * carries one (so deserts and sea spaces are left out of the count).
 */
export function validateScenarioSpec(spec: ScenarioSpec): SpecIssue[] {
  const issues: SpecIssue[] = [];

  if (spec.boards.length === 0) {
    issues.push({ kind: "no-boards" });
  }

  const seen = new Map<number, number>();

  spec.boards.forEach((board, index) => {
    for (const players of board.players) {
      if (seen.has(players)) {
        issues.push({ kind: "duplicate-players", board: index, players });
      }

      seen.set(players, index);
    }

    issues.push(...boardIssues(board, index));
  });

  return issues;
}

/** One issue, phrased for the author. */
export function specIssueText(issue: SpecIssue): string {
  switch (issue.kind) {
    case "no-boards":
      return "Le scénario n'a aucun plateau.";
    case "no-players":
      return "Ce plateau n'est utilisé pour aucun nombre de joueurs.";
    case "duplicate-players":
      return `${issue.players} joueurs sont déjà servis par un autre plateau.`;
    case "empty-zone":
      return `La zone « ${issue.name} » ne contient aucune case.`;
    case "off-board":
      return `La case ${cellKey(issue.cell)} sort du plateau : réduis la zone ou élargis le plateau.`;
    case "overlap":
      return `La case ${cellKey(issue.cell)} est occupée deux fois.`;
    case "tile-count":
      return `La zone « ${issue.name} » compte ${issue.cells} cases pour ${issue.tiles} tuiles déclarées.`;
    case "token-count":
      return `La zone « ${issue.name} » déclare ${issue.tokens} jetons pour ${issue.needed} tuiles qui en portent un.`;
    case "bad-token":
      return `Jeton ${issue.token} impossible (${issue.where}) : les jetons vont de 2 à 12, sans le 7.`;
    case "static-token":
      return `La case ${cellKey(issue.cell)} ne peut pas porter de jeton : ni la mer ni le désert n'en reçoivent.`;
    case "port-count":
      return `La zone « ${issue.name} » épingle ${issue.slots} emplacements de port pour ${issue.types} ports.`;
    case "port-over-land":
      return `La zone « ${issue.name} » épingle des ports sur ${issue.spaces} cases alors qu'elle ne compte que ${issue.land} tuiles de terre.`;
    default:
      return `Le port épinglé en ${cellKey(issue.cell)} n'est pas dans la zone « ${issue.name} ».`;
  }
}
