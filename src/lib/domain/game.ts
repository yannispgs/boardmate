import type { Boardgame } from "./boardgame";
import type { Config, ConfigValues } from "./config";
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
  /**
   * Snapshot of the effective config values confirmed at launch (the recap can
   * tweak them for one game). Null when launched without any tweak-time
   * snapshot; then `config` values / template defaults apply.
   */
  configValues: ConfigValues | null;
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
  players: Array<{
    id: PlayerId;
    name: string;
    isWinner: boolean;
    score: number | null;
  }>;
}

/**
 * Participation row: one per (game, player). This per-participation grain is
 * what makes statistics natural (GROUP BY player, JOIN boardgame). Records the
 * winner and, for scored games, the final `score`; placement / faction become
 * extra columns later.
 */
export interface GamePlayer {
  gameId: GameId;
  playerId: PlayerId;
  seatOrder: number;
  isWinner: boolean;
  /** Final score, once entered (null for unscored games or before entry). */
  score: number | null;
  /**
   * For category-scored games, the per-category points entered at the end
   * (category key → points), summed into `score`. Null otherwise.
   */
  scoreBreakdown: Record<string, number> | null;
}

/**
 * Turn log: one row per completed turn. Total game time and per-player time are
 * derived by summing `durationS` (active time, excluding pauses). Pauses that
 * happened during the turn are recorded too (count + total paused seconds),
 * only counting pauses of at least 5 seconds.
 */
export interface GameTurn {
  id: GameTurnId;
  gameId: GameId;
  playerId: PlayerId;
  round: number;
  turnNo: number;
  durationS: number;
  pauseCount: number;
  pauseDurationS: number;
  /**
   * Active seconds taken beyond the allotted turn duration (the timer counts up
   * once it hits zero). A subset of `durationS`; 0 when the turn finished in
   * time.
   */
  overtimeS: number;
}

/** One recorded score change (live scoring), for the evolution timeline. */
export interface ScoreEvent {
  playerId: PlayerId;
  score: number;
  /** The tour (round) the change happened in. */
  round: number;
  /** ISO 8601 timestamp. */
  at: string;
}

/** One recorded dice roll: the summed value, plus when (for the sequence). */
export interface DiceRoll {
  value: number;
  /** ISO 8601 timestamp — rolls are ordered by this to form the sequence. */
  at: string;
}

/** A game with its related entities resolved, for the play / detail screen. */
export interface PopulatedGame extends Game {
  boardgame: Boardgame;
  config: Config | null;
  /** Score changes over the game, oldest first (empty for unscored games). */
  scoreEvents: ScoreEvent[];
  /** Dice rolls recorded this game, oldest first (empty when not tracked). */
  diceRolls: DiceRoll[];
  /**
   * The score target to win, resolved from the boardgame's `threshold` win
   * condition and this game's config (value, else the config template default).
   * Null when the game isn't threshold-scored.
   */
  winThreshold: number | null;
  players: Array<GamePlayer & { player: Player }>;
  currentPlayer: Player | null;
  turns: GameTurn[];
}

export interface NewGame {
  boardgameId: BoardgameId;
  configId: ConfigId | null;
  /**
   * Effective config values for this game, as confirmed at the launch recap
   * (the selected config's values, possibly tweaked). Omit / null to launch
   * without a snapshot.
   */
  configValues?: ConfigValues | null;
  /** Ordered: index = seat order / turn order. */
  playerIds: PlayerId[];
}
