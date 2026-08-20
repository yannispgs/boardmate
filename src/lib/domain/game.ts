import type { Boardgame, DiceSpec } from "./boardgame";
import type { Config, ConfigValues } from "./config";
import type { Extension, PlayedExtension } from "./extensions";
import type {
  BoardgameId,
  ConfigId,
  ExtensionId,
  ExtensionScenarioId,
  GameId,
  GameSessionId,
  GameTurnId,
  PlayerId,
} from "./ids";
import type { Player } from "./player";
import type { TieBreakRecord } from "./tie-break";

export type GameStatus = "ongoing" | "ended";

export interface Game {
  id: GameId;
  /**
   * The sitting this party belongs to. Parties dealt one after another from the
   * score sheet share it, so an evening of short games folds into one row of
   * the list. Every party has one — a party played on its own is a session of
   * one — so there is never a "no session" case to handle.
   */
  sessionId: GameSessionId;
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
  /**
   * The generation being played, 1-based, for a game whose boardgame declares
   * `stages`. Always `1` for the lap-based games, which have no notion of one.
   */
  stage: number;
  /**
   * Where the game stands inside the current stage: the index of the phase
   * being played in the boardgame's `phases`. Always `0` for a game whose
   * boardgame declares none, which is every game but Terraforming Mars today.
   */
  phase: number;
  currentPlayerId: PlayerId | null;
  /** ISO 8601 timestamps. */
  startedAt: string;
  endedAt: string | null;
  /**
   * How the players tied on the best score were separated, when the game ended
   * on a tie. Null when a single player led outright (the usual case). Shown in
   * the score recap only.
   */
  tieBreak: TieBreakRecord | null;
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
  /**
   * The generation this turn was played in, so the stats can read turns per
   * player per generation. Null for every lap-based game, and for turns played
   * before generations existed.
   */
  stage: number | null;
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

/**
 * One player dropping out of one generation. The passes whose `stage` is the
 * game's are the players currently out; the older ones are the record of when
 * each dropped out, kept for the stats.
 */
export interface StagePass {
  playerId: PlayerId;
  stage: number;
}

/**
 * One stage of one game, as it was set up: the goal tile laid out for it, the
 * values of that tile's parameters, and how many laps it ends up lasting.
 *
 * Written at launch, all of them at once, because the whole calendar follows
 * from the four tiles: a tile that scores nothing lengthens every stage after
 * it. `turns` is therefore the effective count, not the boardgame's base.
 */
export interface GameStage {
  /** 1-based, in play order. */
  stage: number;
  /** The goal tile's key in the boardgame's catalogue. */
  goalKey: string;
  /** The chosen value of each of the tile's parameters, by parameter key. */
  goalParams: Record<string, string>;
  /** Laps of the table this stage lasts. */
  turns: number;
}

/**
 * How long one phase of one stage took, accumulated as the table closes it.
 *
 * Kept per stage rather than per game: « la découverte prend deux minutes en
 * génération 1 et huit en génération 6 » is the whole point of timing them, and
 * a single total per phase would say nothing of the sort. A phase reopened
 * within its stage (the clock was closed too early) adds to the same row.
 */
export interface PhaseTime {
  /** The generation this phase was played in, 1-based. */
  stage: number;
  /** The phase's key in the boardgame's `phases`. */
  phaseKey: string;
  /** Active seconds spent in it (pauses excluded, like a turn's). */
  durationS: number;
}

/** What one player scored on one stage's goal, entered when the stage ends. */
export interface StageScore {
  stage: number;
  playerId: PlayerId;
  points: number;
}

/**
 * One milestone taken, by one player. Claimed during the game and never
 * re-claimable by anybody else, so the set of these *is* the state of the
 * board's milestone row. `stage` is the generation it was taken in — kept for
 * the stats, null in a game not played in generations.
 */
export interface MilestoneClaim {
  playerId: PlayerId;
  milestoneKey: string;
  stage: number | null;
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
  /**
   * Whether the table is playing the drafted draw, resolved from this game's
   * configuration (value, else the config template's default). False for every
   * boardgame with no draftable phase — which is every one but Terraforming
   * Mars and L'Île des Chats.
   */
  drafting: boolean;
  /** Active extensions on this game (empty when none), with their scenario. */
  extensions: Array<Extension & { scenarioId: ExtensionScenarioId | null }>;
  players: Array<GamePlayer & { player: Player }>;
  currentPlayer: Player | null;
  turns: GameTurn[];
  /**
   * Every pass recorded this game, oldest generation first (empty for a
   * lap-based game, where nobody can pass).
   */
  stagePasses: StagePass[];
  /**
   * The calendar this game was set up with, in play order — the goal of each
   * stage and how long it lasts. Empty for every game not played in scheduled
   * stages.
   */
  stages: GameStage[];
  /**
   * What each player scored on each stage's goal, filled in as the stages end.
   * Empty until the first stage is over.
   */
  stageScores: StageScore[];
  /**
   * How long each phase of each stage took, oldest stage first. Empty for every
   * game whose boardgame declares no phases, and until the first one closes.
   */
  phaseTimes: PhaseTime[];
  /**
   * The milestones claimed this game (empty when the game offers none, or when
   * nobody has taken one yet).
   */
  milestoneClaims: MilestoneClaim[];
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
  /**
   * The goal tiles this game was laid out with and what each player took from
   * them. Always set by the adapter (empty for a game played in laps or in
   * generations); optional so lightweight test fixtures can omit it.
   */
  stageGoals?: StageGoalRecord[];
  /**
   * What each player took on each manche, raw. Carried alongside `stageGoals`
   * because a game counted manche by manche (Odin) writes these rows without
   * ever laying a tile: it has no calendar, so `stageGoals` — which is built
   * from one — would read as if the game had no manche at all. Always set by
   * the adapter (empty for a game played in laps); optional so lightweight test
   * fixtures can omit it.
   */
  stageScores?: StageScore[];
  /**
   * How long the table spent in each phase of each stage. Always set by the
   * adapter (empty for every game whose boardgame declares no phase); optional
   * so lightweight test fixtures can omit it.
   *
   * ⚠️ Table time, never comparable with `turns[].durationS`, which belongs to
   * one player — see {@link PhaseTime}.
   */
  phaseTimes?: PhaseTime[];
}

/** One manche of a finished game: the tile it scored, and by whom. */
export interface StageGoalRecord {
  stage: number;
  goalKey: string;
  goalParams: Record<string, string>;
  points: Array<{ playerId: PlayerId; points: number }>;
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
  /**
   * The calendar of a game played in scheduled stages: one entry per stage, in
   * order, with the goal tile it is set up with and the laps it lasts. Omitted
   * for every other game.
   */
  stages?: GameStage[];
  /**
   * The sitting to file this party under. Set only when dealing the next party
   * of an evening, to the session the previous one already carries; omitted
   * everywhere else, and the database then opens a session of one.
   */
  sessionId?: GameSessionId;
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
  /** Usually one player; several on a shared victory (ex æquo). */
  winnerIds: PlayerId[];
  players: FinishedGameEntry[];
  /** Extensions it was played with (empty when none). */
  extensionIds?: ExtensionId[];
  /** For a scenario-based extension, the scenario played. */
  scenarioByExtension?: Record<ExtensionId, ExtensionScenarioId>;
  /**
   * The stages it was played on, when the table still remembers them. Optional
   * and all-or-nothing: a half-recalled calendar would make the goal stats read
   * as if the missing manches had scored nothing. `turns` is reconstructed from
   * the tiles by the same rule the launch funnel applies.
   */
  stages?: GameStage[];
  /** What each player took from each stage's goal — one per stage per player. */
  stageScores?: StageScore[];
}
