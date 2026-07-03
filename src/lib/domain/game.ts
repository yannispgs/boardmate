import type { Boardgame } from "./boardgame";
import type { Config } from "./config";
import type {
  BoardgameId,
  ConfigId,
  GameId,
  GameTurnId,
  PlayerId,
} from "./ids";
import type { Player } from "./player";

export type GameStatus = "ongoing" | "ended";

export interface Game {
  id: GameId;
  boardgameId: BoardgameId;
  configId: ConfigId | null;
  status: GameStatus;
  round: number;
  turn: number;
  currentPlayerId: PlayerId | null;
  /** ISO 8601 timestamps. */
  startedAt: string;
  endedAt: string | null;
}

/**
 * A game enriched with its participants in play order — what the games list
 * needs to show the player count and enumerate players (without the full
 * `PopulatedGame` payload).
 */
export interface GameListItem extends Game {
  players: Array<{ id: PlayerId; name: string; isWinner: boolean }>;
}

/**
 * Participation row: one per (game, player). This per-participation grain is
 * what makes statistics natural (GROUP BY player, JOIN boardgame). v1 only
 * records `isWinner`; score / placement / faction become extra columns later.
 */
export interface GamePlayer {
  gameId: GameId;
  playerId: PlayerId;
  seatOrder: number;
  isWinner: boolean;
}

/**
 * Turn log: one row per completed turn. Total game time and per-player time are
 * derived by summing `durationS` (active time, excluding pauses).
 */
export interface GameTurn {
  id: GameTurnId;
  gameId: GameId;
  playerId: PlayerId;
  round: number;
  turnNo: number;
  durationS: number;
}

/** A game with its related entities resolved, for the play / detail screen. */
export interface PopulatedGame extends Game {
  boardgame: Boardgame;
  config: Config | null;
  players: Array<GamePlayer & { player: Player }>;
  currentPlayer: Player | null;
  turns: GameTurn[];
}

export interface NewGame {
  boardgameId: BoardgameId;
  configId: ConfigId | null;
  /** Ordered: index = seat order / turn order. */
  playerIds: PlayerId[];
}
