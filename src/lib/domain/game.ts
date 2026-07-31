import type { Boardgame, DiceSpec } from "./boardgame";
import type { Config, ConfigValues } from "./config";
import type { Extension, PlayedExtension } from "./extensions";
import type {
  BoardgameId,
  ConfigId,
  ExtensionId,
  ExtensionScenarioId,
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
  /** Extensions this game was played with, in application order (often empty). */
  extensions: PlayedExtension[];
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
  /**
   * Who played the turn — `null` for a simultaneous round (everyone plays at
   * once, so the round has no single owner; see {@link GameTurn.blockedById}).
   */
  playerId: PlayerId | null;
  /**
   * Simultaneous rounds only: the player the table waited on this round (tapped
   * during play), or `null`. Always `null` for sequential turns.
   */
  blockedById: PlayerId | null;
  /**
   * Simultaneous rounds only: seconds waited on {@link GameTurn.blockedById} —
   * from tapping them to advancing the round. 0 when nobody was flagged.
   */
  waitedS: number;
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

/**
 * The per-round turn-time schedule: a turn lasts `baseS`, growing by `stepS`
 * each round (tour de table), capped at `maxS`. `stepS = 0` is a constant timer.
 * Resolved from the game's config (value, else the config template default).
 */
export interface TurnSchedule {
  baseS: number;
  stepS: number;
  maxS: number;
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
  /** Per-round turn-time schedule, resolved from config / template defaults. */
  turnSchedule: TurnSchedule;
  /** Active extensions on this game (empty when none), with their scenario. */
  extensions: Array<Extension & { scenarioId: ExtensionScenarioId | null }>;
  players: Array<GamePlayer & { player: Player }>;
  currentPlayer: Player | null;
  turns: GameTurn[];
}

/**
 * A finished game reduced to what cross-game aggregation needs (the global
 * stats page): its boardgame, participants (winner + final score) and the turn
 * log. Lighter than `PopulatedGame` — no config/threshold/score timeline — so
 * many games can be pulled and averaged in one query.
 */
export interface GameStatsRecord {
  gameId: GameId;
  boardgameId: BoardgameId;
  boardgameName: string;
  /** The boardgame's dice spec, when it tracks dice (null otherwise). */
  dice: DiceSpec | null;
  /** ISO 8601, when the game ended (null defensively — ended games have it). */
  endedAt: string | null;
  players: Array<{
    playerId: PlayerId;
    name: string;
    seatOrder: number;
    isWinner: boolean;
    score: number | null;
    /**
     * Per-category points for category-scored games. Always set by the adapter
     * (null for non-category / total-only games); optional so lightweight test
     * fixtures can omit it (treated the same as null).
     */
    scoreBreakdown?: Record<string, number> | null;
  }>;
  turns: Array<{
    playerId: PlayerId;
    round: number;
    durationS: number;
    pauseDurationS: number;
    overtimeS: number;
  }>;
  /** Summed dice values rolled this game, in draw order (empty when untracked). */
  diceRolls: number[];
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
  /**
   * Score to seed every player at, for live-scored games (so none stays
   * unscored). `null`/omitted leaves scores empty (final-scored or unscored
   * games, entered at the end). See `initialScoreFor`.
   */
  initialScore?: number | null;
  /** Active extensions for this game (empty when none). */
  extensionIds?: ExtensionId[];
  /** For a scenario-based extension, the chosen scenario. */
  scenarioByExtension?: Record<ExtensionId, ExtensionScenarioId>;
}

/** One participant of an already-finished game being recorded after the fact. */
export interface FinishedGameEntry {
  playerId: PlayerId;
  seatOrder: number;
  /** Final score, or `null` for an unscored game. */
  score: number | null;
  /** Per-category breakdown for a category-scored game, else `null`. */
  breakdown: Record<string, number> | null;
}

/**
 * An already-played game entered retroactively so it counts in the stats. It is
 * stored `ended` with its participants, winner and final scores, but no turn or
 * dice log — there is no play history to reconstruct.
 */
export interface NewFinishedGame {
  boardgameId: BoardgameId;
  /** When the game ended (ISO 8601) — drives the stats date windows. */
  endedAt: string;
  winnerId: PlayerId;
  players: FinishedGameEntry[];
}
