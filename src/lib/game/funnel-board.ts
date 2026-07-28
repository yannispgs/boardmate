/**
 * Which board the new-game funnel offers to set up, once the game is configured
 * and the players are seated.
 *
 * The step is not a second board generator: everything it needs is already
 * decided by then — the game says whether it is played on a generated board at
 * all, an active extension may take that board over with a scenario of its own,
 * and the number of seats settles the size. So this reads the choice out of the
 * game rather than asking for it again, and answers `null` when there is nothing
 * to draw — in which case the funnel skips straight to the launch.
 */

import type { CatanVariantId } from "@/lib/catan/board";
import { marinsBoardFor } from "@/lib/catan/marins";
import type {
  ScenarioBoardSpec,
  ScenarioSpec,
} from "@/lib/catan/scenario-spec";
import type { Boardgame, Extension, ExtensionScenarioId } from "@/lib/domain";

/** From this many players on, Catan is played on its 5–6 player board. */
const EXTENSION_FROM = 5;

/** The board to draw: the base game's, or the map of a chosen scenario. */
export type FunnelBoard =
  | { kind: "base"; size: CatanVariantId }
  | {
      kind: "scenario";
      /** The scenario as its author saved it, drawn at `players`. */
      spec: ScenarioSpec;
      /** The map of that scenario for this many players. */
      board: ScenarioBoardSpec;
      players: number;
    };

/** The map an extension puts in place of the base board, when it has one. */
function scenarioBoardOf(
  ext: Extension,
  scenarioId: ExtensionScenarioId | undefined,
  players: number,
): FunnelBoard | null {
  const spec = ext.scenarios.find(s => s.id === scenarioId)?.boardSpec ?? null;

  if (spec === null) {
    return null;
  }

  const board = marinsBoardFor(spec, players);

  return board === undefined
    ? null
    : { kind: "scenario", spec, board, players };
}

/**
 * The board this game is about to be played on, or `null` when the app has none
 * to offer: a game with no generator, or an extension that takes the board over
 * with a scenario nobody has drawn a map for at this player count. Answering
 * `null` there rather than falling back to the base board is deliberate — a
 * board drawn under the wrong rules is worse than no board at all.
 */
export function funnelBoard(
  boardgame: Pick<Boardgame, "boardGenerator">,
  /** The extensions switched on for this game, in application order. */
  activeExtensions: Extension[],
  scenarioByExtension: Record<string, ExtensionScenarioId | undefined>,
  players: number,
): FunnelBoard | null {
  if (boardgame.boardGenerator === null) {
    return null;
  }

  const changing = activeExtensions.filter(e => e.changesBoard);

  if (changing.length === 0) {
    return {
      kind: "base",
      size: players >= EXTENSION_FROM ? "extension" : "base",
    };
  }

  for (const ext of changing) {
    const board = scenarioBoardOf(ext, scenarioByExtension[ext.id], players);

    if (board !== null) {
      return board;
    }
  }

  return null;
}
