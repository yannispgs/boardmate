/**
 * Dealing the next party without leaving the table.
 *
 * Some games are played one short party after another — a Papayoo deal lasts a
 * quarter of an hour, and the evening is a dozen of them. Walking back through
 * « Parties » → « Nouvelle partie » → jeu → joueurs between two deals takes
 * longer than the deal itself, so the score sheet offers to open the next one
 * directly.
 *
 * The next party is the same one again: same players in the same seats, same
 * config, same extensions. Nothing is asked, because nothing changed — the
 * table did not get up.
 *
 * Pure: no vendor types, unit-tested.
 */

import type {
  BoardgameId,
  ConfigId,
  ConfigValues,
  ExtensionId,
  ExtensionScenarioId,
  GameSessionId,
  NewGame,
  PlayerId,
  ScoringSpec,
} from "@/lib/domain";

import { initialScoreFor } from "./scoring";

/** What dealing the same party again needs to know about the current one. */
export interface ChainableGame {
  sessionId: GameSessionId;
  boardgameId: BoardgameId;
  configId: ConfigId | null;
  configValues: ConfigValues | null;
  boardgame: Readonly<{ scoring: ScoringSpec | null }>;
  players: ReadonlyArray<{ playerId: PlayerId; seatOrder: number }>;
  extensions: ReadonlyArray<{
    id: ExtensionId;
    scenarioId: ExtensionScenarioId | null;
  }>;
}

/**
 * The party to open once this one is recorded: this one, dealt again.
 *
 * It joins the session of the party it follows, so the evening stays one row of
 * the list however many deals it ends up being.
 */
export function chainedGame(game: ChainableGame): NewGame {
  return {
    sessionId: game.sessionId,
    boardgameId: game.boardgameId,
    configId: game.configId,
    configValues: game.configValues,
    // Seats are read from the seat order rather than from the array, so the
    // players sit down again in the order they are playing in, not the order
    // the query happened to return them.
    playerIds: [...game.players]
      .sort((a, b) => a.seatOrder - b.seatOrder)
      .map(p => p.playerId),
    initialScore: initialScoreFor(game.boardgame.scoring),
    extensionIds: game.extensions.map(e => e.id),
    scenarioByExtension: scenarios(game.extensions),
  };
}

/**
 * The scenario each extension was set up with, kept as it was. An extension
 * with no scenario to pick contributes nothing, rather than a null the creation
 * would have to filter out again.
 */
function scenarios(
  extensions: ChainableGame["extensions"],
): Record<ExtensionId, ExtensionScenarioId> {
  const chosen: Record<ExtensionId, ExtensionScenarioId> = {};

  for (const extension of extensions) {
    if (extension.scenarioId !== null) {
      chosen[extension.id] = extension.scenarioId;
    }
  }

  return chosen;
}
