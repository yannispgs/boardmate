/**
 * Editing an authored scenario, as pure functions.
 *
 * Every operation the scenario editor offers lives here and takes a whole
 * {@link ScenarioSpec} to a new one, so the screen itself holds nothing but the
 * current spec and what the author has selected. Nothing here judges whether the
 * result adds up — that stays {@link validateScenarioSpec}'s job, run on every
 * keystroke, so the author can leave the scenario half-painted while they work.
 *
 * The one invariant kept throughout: **a space belongs to at most one thing**.
 * Painting a space into a zone takes it away from whatever held it before,
 * which is what makes painting feel like painting.
 */

import type { CatanPortType } from "./board";
import {
  boardOutline,
  cellKey,
  DEFAULT_WIDTH,
  MAX_WIDTH,
  MIN_WIDTH,
  minimumWidth,
  type ScenarioBoardSpec,
  type ScenarioSpec,
  type ScenarioZone,
  type SpecCell,
  type SpecPort,
  type SpecTerrain,
  type StaticTile,
} from "./scenario-spec";

/** The tokens a bag may hold, in the order the editor lists them. */
export const TOKEN_VALUES = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

/** The spaces of a board `width` wide — the canvas is exactly the map. */
export function canvasGrid(width: number): SpecCell[] {
  return boardOutline(width);
}

/**
 * The narrowest the author may take this board without pushing painted spaces
 * off the map. Narrowing to that and no further is what keeps a stray click
 * from silently deleting an island.
 */
export function narrowestWidth(board: ScenarioBoardSpec): number {
  return minimumWidth(boardCells(board));
}

/** Sets a board's width, refusing to cut off anything already painted. */
export function setBoardWidth(
  spec: ScenarioSpec,
  index: number,
  width: number,
): ScenarioSpec {
  const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));

  return withBoard(spec, index, board => ({
    ...board,
    width: Math.max(clamped, narrowestWidth(board)),
  }));
}

/** Every space a board has claimed, zones and static tiles alike. */
function boardCells(board: ScenarioBoardSpec): SpecCell[] {
  return [
    ...board.zones.flatMap(zone => zone.cells),
    ...(board.statics ?? []).map(tile => tile.cell),
  ];
}

/** What holds a space, if anything — what the canvas colours it by. */
export type CellOwner =
  | { kind: "zone"; zone: number }
  | { kind: "static"; tile: StaticTile }
  | null;

/** What holds a given space of a board. */
export function cellOwner(board: ScenarioBoardSpec, cell: SpecCell): CellOwner {
  const key = cellKey(cell);
  const zone = board.zones.findIndex(z =>
    z.cells.some(c => cellKey(c) === key),
  );

  if (zone !== -1) {
    return { kind: "zone", zone };
  }

  const tile = (board.statics ?? []).find(t => cellKey(t.cell) === key);

  return tile ? { kind: "static", tile } : null;
}

/** A zone with nothing in it yet. */
export function emptyZone(name: string): ScenarioZone {
  return { name, cells: [], terrainCounts: {}, numberTokens: [] };
}

/** A board with one empty zone, used at the given player counts. */
export function emptyBoard(players: number[]): ScenarioBoardSpec {
  return { players, width: DEFAULT_WIDTH, zones: [emptyZone("Zone 1")] };
}

/** A blank scenario: one board for three players, nothing painted. */
export function emptyScenario(): ScenarioSpec {
  return { name: "", targetScore: 12, boards: [emptyBoard([3])] };
}

/** Replaces one board of a scenario with what `change` makes of it. */
function withBoard(
  spec: ScenarioSpec,
  index: number,
  change: (board: ScenarioBoardSpec) => ScenarioBoardSpec,
): ScenarioSpec {
  return {
    ...spec,
    boards: spec.boards.map((board, i) =>
      i === index ? change(board) : board,
    ),
  };
}

/** Replaces one zone of one board with what `change` makes of it. */
function withZone(
  spec: ScenarioSpec,
  board: number,
  zone: number,
  change: (zone: ScenarioZone) => ScenarioZone,
): ScenarioSpec {
  return withBoard(spec, board, b => ({
    ...b,
    zones: b.zones.map((z, i) => (i === zone ? change(z) : z)),
  }));
}

export function setScenarioName(
  spec: ScenarioSpec,
  name: string,
): ScenarioSpec {
  return { ...spec, name };
}

export function setTargetScore(
  spec: ScenarioSpec,
  targetScore: number,
): ScenarioSpec {
  return { ...spec, targetScore };
}

/** Adds an empty board for another player count. */
export function addBoard(spec: ScenarioSpec, players: number[]): ScenarioSpec {
  return { ...spec, boards: [...spec.boards, emptyBoard(players)] };
}

/**
 * Copies a board over to another player count — the rulebook's maps differ by a
 * few tiles between counts, so the author starts from the one next door rather
 * than painting the whole thing again.
 */
export function duplicateBoard(
  spec: ScenarioSpec,
  index: number,
  players: number[],
): ScenarioSpec {
  const copy = structuredClone(spec.boards[index]);

  return { ...spec, boards: [...spec.boards, { ...copy, players }] };
}

export function removeBoard(spec: ScenarioSpec, index: number): ScenarioSpec {
  return { ...spec, boards: spec.boards.filter((_, i) => i !== index) };
}

export function setBoardPlayers(
  spec: ScenarioSpec,
  index: number,
  players: number[],
): ScenarioSpec {
  return withBoard(spec, index, board => ({ ...board, players }));
}

export function addZone(
  spec: ScenarioSpec,
  board: number,
  name?: string,
): ScenarioSpec {
  return withBoard(spec, board, b => ({
    ...b,
    zones: [...b.zones, emptyZone(name ?? `Zone ${b.zones.length + 1}`)],
  }));
}

export function removeZone(
  spec: ScenarioSpec,
  board: number,
  zone: number,
): ScenarioSpec {
  return withBoard(spec, board, b => ({
    ...b,
    zones: b.zones.filter((_, i) => i !== zone),
  }));
}

export function renameZone(
  spec: ScenarioSpec,
  board: number,
  zone: number,
  name: string,
): ScenarioSpec {
  return withZone(spec, board, zone, z => ({ ...z, name }));
}

/** Takes a space away from whatever holds it — a zone, or a static tile. */
export function eraseCell(
  spec: ScenarioSpec,
  board: number,
  cell: SpecCell,
): ScenarioSpec {
  const key = cellKey(cell);

  return withBoard(spec, board, b => ({
    ...b,
    zones: b.zones.map(zone => ({
      ...zone,
      cells: zone.cells.filter(c => cellKey(c) !== key),
      ports: zone.ports && {
        ...zone.ports,
        slots: zone.ports.slots?.filter(slot => cellKey(slot) !== key),
      },
    })),
    statics: (b.statics ?? []).filter(tile => cellKey(tile.cell) !== key),
  }));
}

/** Paints a space into a zone, taking it from whatever held it before. */
export function paintCell(
  spec: ScenarioSpec,
  board: number,
  zone: number,
  cell: SpecCell,
): ScenarioSpec {
  const cleared = eraseCell(spec, board, cell);

  return withZone(cleared, board, zone, z => ({
    ...z,
    cells: [...z.cells, { q: cell.q, r: cell.r }],
  }));
}

/** How many tiles of each terrain a bag holds — one entry per terrain shown. */
export function setTerrainCount(
  spec: ScenarioSpec,
  board: number,
  zone: number,
  terrain: SpecTerrain,
  count: number,
): ScenarioSpec {
  return withZone(spec, board, zone, z => {
    const terrainCounts = { ...z.terrainCounts };

    if (count > 0) {
      terrainCounts[terrain] = count;
    } else {
      delete terrainCounts[terrain];
    }

    return { ...z, terrainCounts };
  });
}

/** How many of a given multiset entry there are, by value. */
function counts<T extends string | number>(values: T[]): Map<T, number> {
  const map = new Map<T, number>();

  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }

  return map;
}

/** How many of each token a bag holds — what the editor's counters show. */
export function tokenCounts(tokens: number[]): Map<number, number> {
  return counts(tokens);
}

/** How many harbours of each type a bag holds. */
export function portTypeCounts(
  types: CatanPortType[],
): Map<CatanPortType, number> {
  return counts(types);
}

/** Sets how many of one token a bag holds, keeping the bag in order. */
export function setTokenCount(
  spec: ScenarioSpec,
  board: number,
  zone: number,
  token: number,
  count: number,
): ScenarioSpec {
  return withZone(spec, board, zone, z => {
    const kept = tokenCounts(z.numberTokens);

    kept.set(token, Math.max(0, count));

    const numberTokens = TOKEN_VALUES.flatMap(value =>
      Array.from({ length: kept.get(value) ?? 0 }, () => value),
    );

    return { ...z, numberTokens };
  });
}

/** Sets how many harbours of one type a zone's bag holds. */
export function setPortTypeCount(
  spec: ScenarioSpec,
  board: number,
  zone: number,
  type: CatanPortType,
  count: number,
): ScenarioSpec {
  return withZone(spec, board, zone, z => {
    const kept = portTypeCounts(z.ports?.types ?? []);

    kept.set(type, Math.max(0, count));

    const types = [...kept.entries()].flatMap(([value, n]) =>
      Array.from({ length: n }, () => value),
    );

    return { ...z, ports: { ...z.ports, types } };
  });
}

/** Lays a zone's tiles face down, or back up (the fog island). */
export function setZoneHidden(
  spec: ScenarioSpec,
  board: number,
  zone: number,
  hidden: boolean,
): ScenarioSpec {
  return withZone(spec, board, zone, z => {
    const { hidden: _was, ...rest } = z;

    return hidden ? { ...rest, hidden: true } : rest;
  });
}

/**
 * How many islands a zone's land should form, or `null` to let the land fall
 * where the shuffle drops it.
 */
export function setZoneIslands(
  spec: ScenarioSpec,
  board: number,
  zone: number,
  islands: readonly [number, number] | null,
): ScenarioSpec {
  return withZone(spec, board, zone, z => {
    const { islands: _were, ...rest } = z;

    return islands === null ? rest : { ...rest, islands };
  });
}

/** Whether two harbours sit on the same edge of the same space. */
function samePort(a: SpecPort, b: SpecPort): boolean {
  return a.q === b.q && a.r === b.r && a.dq === b.dq && a.dr === b.dr;
}

/**
 * The zone that pins a given harbour, if any. A click on the map unpins the
 * harbour it lands on whichever zone holds it — not the one being edited.
 */
export function zoneOfPortSlot(
  board: ScenarioBoardSpec,
  port: SpecPort,
): number | null {
  const index = board.zones.findIndex(zone =>
    (zone.ports?.slots ?? []).some(slot => samePort(slot, port)),
  );

  return index === -1 ? null : index;
}

/** Pins a harbour on an edge, or unpins the one already there. */
export function togglePortSlot(
  spec: ScenarioSpec,
  board: number,
  zone: number,
  port: SpecPort,
): ScenarioSpec {
  return withZone(spec, board, zone, z => {
    const slots = z.ports?.slots ?? [];
    const kept = slots.some(slot => samePort(slot, port))
      ? slots.filter(slot => !samePort(slot, port))
      : [...slots, port];

    return { ...z, ports: { types: z.ports?.types ?? [], slots: kept } };
  });
}

/**
 * Fixes a space's terrain — and sometimes its token — for every game. The space
 * leaves whatever zone held it, since a static tile is drawn from nothing.
 */
export function setStaticTile(
  spec: ScenarioSpec,
  board: number,
  cell: SpecCell,
  terrain: SpecTerrain,
  number?: number,
): ScenarioSpec {
  const cleared = eraseCell(spec, board, cell);
  const tile: StaticTile =
    number === undefined
      ? { cell: { q: cell.q, r: cell.r }, terrain }
      : { cell: { q: cell.q, r: cell.r }, terrain, number };

  return withBoard(cleared, board, b => ({
    ...b,
    /* c8 ignore next -- `eraseCell` just left `statics` an array; the fallback
       only satisfies the optional type */
    statics: [...(b.statics ?? []), tile],
  }));
}
