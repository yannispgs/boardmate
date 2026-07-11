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
  Feedback,
  Game,
  GameId,
  GameListItem,
  GameStatsRecord,
  GameStatus,
  NewBoardgame,
  NewConfig,
  NewFeedback,
  NewGame,
  NewPlayer,
  Player,
  PlayerId,
  PlayerUpdate,
  PopulatedGame,
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
   * Records the current turn — its active time, any pauses (count + total
   * paused seconds, ≥ 5 s each), and the overtime taken beyond the allotted
   * duration — then rotates to the next player.
   */
  advanceTurn(
    id: GameId,
    elapsedSeconds: number,
    pauseCount: number,
    pauseDurationSeconds: number,
    overtimeSeconds: number,
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
  subscribe(onChange: () => void): Unsubscribe;
}

export interface FeedbackRepository {
  /** Improvement ideas, newest first. */
  list(): Promise<Feedback[]>;
  create(input: NewFeedback): Promise<Feedback>;
}

/** Aggregate of all repositories, resolved by the active adapter. */
export interface Repositories {
  players: PlayerRepository;
  boardgames: BoardgameRepository;
  configs: ConfigRepository;
  games: GameRepository;
  feedback: FeedbackRepository;
}
