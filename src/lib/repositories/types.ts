/**
 * Repository interfaces — the anti-lock-in seam.
 *
 * UI and hooks depend ONLY on these interfaces, never on a vendor SDK.
 * Swapping the backend (Supabase -> anything) means rewriting only the adapter
 * under `./supabase`, not the application.
 */
import type {
  Boardgame,
  BoardgameId,
  BoardgameUpdate,
  Config,
  ConfigId,
  ConfigTemplate,
  ConfigValues,
  Extension,
  ExtensionScenario,
  ExtensionScenarioId,
  ExtensionScenarioUpdate,
  FaqEntry,
  FaqEntryId,
  FaqEntryUpdate,
  Feedback,
  FieldSpec,
  Game,
  GameId,
  GameListItem,
  GameStatsRecord,
  GameStatus,
  NewBoardgame,
  NewConfig,
  NewExtensionScenario,
  NewFaqEntry,
  NewFeedback,
  NewFinishedGame,
  NewGame,
  NewPlayer,
  Player,
  PlayerId,
  PlayerUpdate,
  PopulatedGame,
  TurnMode,
} from "@/lib/domain";

/** Call to stop a realtime subscription. */
export type Unsubscribe = () => void;

export interface PlayerRepository {
  list(): Promise<Player[]>;
  get(id: PlayerId): Promise<Player | null>;
  /** Rejects with `DuplicateNameError` if the name is already taken. */
  create(input: NewPlayer): Promise<Player>;
  /** Rejects with `DuplicateNameError` if the new name is already taken. */
  update(id: PlayerId, patch: PlayerUpdate): Promise<Player>;
  /**
   * Activate / deactivate a player. A deactivated player drops out of
   * selection lists but keeps its history — the right choice once a player has
   * played and can no longer be deleted.
   */
  setActive(id: PlayerId, isActive: boolean): Promise<Player>;
  /**
   * Permanently deletes a player. Only possible while they have no game
   * history; rejects with `PlayerInUseError` once they've taken part in a game.
   */
  remove(id: PlayerId): Promise<void>;
  subscribe(onChange: () => void): Unsubscribe;
}

export interface BoardgameRepository {
  list(): Promise<Boardgame[]>;
  get(id: BoardgameId): Promise<Boardgame | null>;
  create(input: NewBoardgame): Promise<Boardgame>;
  update(id: BoardgameId, patch: BoardgameUpdate): Promise<Boardgame>;
  /**
   * Activate / deactivate a boardgame. A deactivated boardgame drops out of
   * selection lists but keeps its history — the right choice once it has games
   * and can no longer be deleted.
   */
  setActive(id: BoardgameId, isActive: boolean): Promise<Boardgame>;
  /**
   * Permanently deletes a boardgame. Only possible while it has no games;
   * rejects with `BoardgameInUseError` once a game has been played with it.
   */
  remove(id: BoardgameId): Promise<void>;
  /** Uploads a logo image and returns its public URL. */
  uploadLogo(file: File): Promise<string>;
  subscribe(onChange: () => void): Unsubscribe;
}

export interface ConfigRepository {
  /** The fixed template describing the fields for a boardgame. */
  getTemplate(boardgameId: BoardgameId): Promise<ConfigTemplate | null>;
  listTemplates(): Promise<ConfigTemplate[]>;
  /**
   * Rewrites the template's field defaults from `defaults` (keyed by field key)
   * — the values that pre-fill every new config for this boardgame. Only scalar
   * leaf fields carry a default; object/array fields are left untouched. Lets
   * the owner tune a game's default configuration (timer included) from the UI
   * instead of editing the seed data.
   */
  updateTemplateDefaults(
    boardgameId: BoardgameId,
    defaults: ConfigValues,
  ): Promise<ConfigTemplate>;
  /**
   * Creates or replaces the template's FIELD DEFINITIONS (the schema of tunable
   * parameters — timer, options…), upserting the single config_templates row
   * for the boardgame. Lets the owner define a game's configuration from the UI
   * rather than the seed data.
   */
  saveTemplateFields(
    boardgameId: BoardgameId,
    fields: FieldSpec[],
  ): Promise<ConfigTemplate>;
  /** Config instances, optionally filtered by boardgame. */
  list(boardgameId?: BoardgameId): Promise<Config[]>;
  get(id: ConfigId): Promise<Config | null>;
  create(input: NewConfig): Promise<Config>;
  update(
    id: ConfigId,
    patch: { name?: string; values?: ConfigValues },
  ): Promise<Config>;
  remove(id: ConfigId): Promise<void>;
  subscribe(onChange: () => void): Unsubscribe;
}

export interface GameRepository {
  /**
   * Defaults to ongoing games only when no filter is given. Each item carries
   * its participants in play order (for the games list).
   */
  list(filter?: { status?: GameStatus }): Promise<GameListItem[]>;
  /**
   * All finished games reduced to what the global stats page averages
   * (boardgame, participants + winner/score, turn log). One query for the lot.
   */
  listStats(): Promise<GameStatsRecord[]>;
  getPopulated(id: GameId): Promise<PopulatedGame | null>;
  create(input: NewGame): Promise<Game>;
  /**
   * Records an already-played game directly as `ended`, with its participants,
   * winner and final scores but no turn/dice log — so it still counts in the
   * game and player statistics.
   */
  createFinished(input: NewFinishedGame): Promise<Game>;
  /**
   * Permanently deletes a game and all its rows (turns, scores, dice) — used to
   * abandon a game in progress. History deletion goes through this too, but the
   * UI only offers it for ongoing games.
   */
  remove(id: GameId): Promise<void>;
  /**
   * Records the current turn — its active time, any pauses (count + total
   * paused seconds, ≥ 5 s each), and the overtime taken beyond the allotted
   * duration — then advances. Sequential games rotate to the next player; for a
   * `simultaneous` game (`opts.turnMode`) the whole round advances at once, the
   * turn is recorded with no owner, and `opts.blockedById` optionally flags the
   * player the table waited on — for `opts.waitedSeconds` (tap → advance).
   */
  advanceTurn(
    id: GameId,
    elapsedSeconds: number,
    pauseCount: number,
    pauseDurationSeconds: number,
    overtimeSeconds: number,
    opts?: {
      turnMode?: TurnMode;
      blockedById?: PlayerId | null;
      waitedSeconds?: number;
    },
  ): Promise<void>;
  /** Sets one player's current score (live scoring), logged at the given tour. */
  setScore(
    id: GameId,
    playerId: PlayerId,
    score: number,
    round: number,
  ): Promise<void>;
  /** Records one dice roll (the summed value) for the game's roll log. */
  addDiceRoll(id: GameId, value: number): Promise<void>;
  /**
   * Ends the game, marks the winner, and (for scored games) records each
   * player's final score — plus, for category-scored games, the per-category
   * `breakdown` (category key → points) that sums to it.
   */
  end(
    id: GameId,
    winnerId: PlayerId,
    scores?: Array<{
      playerId: PlayerId;
      score: number;
      breakdown?: Record<string, number>;
    }>,
  ): Promise<void>;
  /**
   * Ends a cooperative game on a *shared* outcome: `won` marks every player a
   * winner, otherwise none — the group wins or loses together (no individual
   * winner). Scored coop games will refine this later.
   */
  endCoop(id: GameId, won: boolean): Promise<void>;
  /**
   * Retroactively records the per-category `breakdown` (and the re-derived
   * total + winner) for an already-ended category game that was logged with
   * only a total. Every player's `is_winner` is reset, then the recomputed
   * winner is set.
   */
  setBreakdown(
    id: GameId,
    winnerId: PlayerId,
    scores: Array<{
      playerId: PlayerId;
      score: number;
      breakdown: Record<string, number>;
    }>,
  ): Promise<void>;
  subscribe(onChange: () => void): Unsubscribe;
}

export interface FeedbackRepository {
  /** Improvement ideas, newest first. */
  list(): Promise<Feedback[]>;
  create(input: NewFeedback): Promise<Feedback>;
}

export interface ExtensionRepository {
  /** The active extensions (with their scenarios) available for a base game. */
  listByBase(baseGameId: BoardgameId): Promise<Extension[]>;
  /**
   * Every active extension, whatever the game — what a screen that spans all of
   * them needs (the FAQ offers a section per extension and has to name them).
   */
  listAll(): Promise<Extension[]>;
  /** The ids of the base games that have at least one active extension. */
  listExtendedBaseGames(): Promise<BoardgameId[]>;
  /**
   * One extension by its stable key — how a screen built around a specific
   * extension (the Marins board generator) finds it without knowing an id.
   */
  getByKey(key: string): Promise<Extension | null>;
  /** Saves a scenario authored in the app (the Marins scenario editor). */
  createScenario(input: NewExtensionScenario): Promise<ExtensionScenario>;
  updateScenario(
    id: ExtensionScenarioId,
    patch: ExtensionScenarioUpdate,
  ): Promise<ExtensionScenario>;
  /**
   * Permanently deletes an authored scenario. Only possible while no game has
   * been played with it; rejects with `ScenarioInUseError` otherwise.
   */
  deleteScenario(id: ExtensionScenarioId): Promise<void>;
}

export interface FaqRepository {
  /**
   * The whole FAQ, every scope together. It is a handful of questions per game,
   * and loading it in one go is what lets a search answer across all of them —
   * you rarely know which rulebook holds the answer before you find it.
   */
  list(): Promise<FaqEntry[]>;
  create(input: NewFaqEntry): Promise<FaqEntry>;
  update(id: FaqEntryId, patch: FaqEntryUpdate): Promise<FaqEntry>;
  remove(id: FaqEntryId): Promise<void>;
  /** Persists a new reading order, as returned by `moveEntry`. */
  reorder(changes: Array<{ id: FaqEntryId; sortOrder: number }>): Promise<void>;
}

/** Aggregate of all repositories, resolved by the active adapter. */
export interface Repositories {
  players: PlayerRepository;
  boardgames: BoardgameRepository;
  configs: ConfigRepository;
  games: GameRepository;
  feedback: FeedbackRepository;
  extensions: ExtensionRepository;
  faq: FaqRepository;
}
