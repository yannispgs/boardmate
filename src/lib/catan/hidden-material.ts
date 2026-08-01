/**
 * What has to be set aside before a game on a map that holds fog.
 *
 * A face-down zone is not drawn by the app the way the rest of the board is:
 * the rulebook has the players shuffle its tiles face down and turn a number
 * token over only once a ship reaches one. So what a generated board can say
 * about it is not *where* each tile goes — that is the whole point of the fog —
 * but **which** tiles and tokens to take out of the box, which is exactly the
 * tedious part of the setup.
 */

import {
  bagTileCount,
  type ScenarioBoardSpec,
  type SpecTerrain,
} from "./scenario-spec";

/** The pile one fog zone asks for: its tiles, its tokens, and how many. */
export interface HiddenZoneMaterial {
  /** The zone as its author named it. */
  name: string;
  /** The tiles of its bag, sea included — shuffled face down, not placed. */
  terrainCounts: Partial<Record<SpecTerrain, number>>;
  /** The tokens of its bag, ascending — drawn as tiles are turned over. */
  tokens: number[];
  /** How many tiles the pile holds. */
  tiles: number;
}

/**
 * The piles to prepare for a board, one per face-down zone — empty on a map
 * with no fog at all, which is most of them.
 */
export function hiddenMaterial(board: ScenarioBoardSpec): HiddenZoneMaterial[] {
  return board.zones
    .filter(zone => zone.hidden === true)
    .map(zone => ({
      name: zone.name,
      terrainCounts: zone.terrainCounts,
      tokens: [...zone.numberTokens].sort((a, b) => a - b),
      tiles: bagTileCount(zone.terrainCounts),
    }));
}
