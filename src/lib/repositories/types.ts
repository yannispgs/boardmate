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
  Game,
  GameId,
  GameStatus,
  NewBoardgame,
  NewConfig,
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
  create(input: NewPlayer): Promise<Player>;
  update(id: PlayerId, patch: PlayerUpdate): Promise<Player>;
  /**
   * Activate / deactivate a player. We never delete players from the DB; a
   * deactivated player drops out of selection lists but keeps its history.
   */
  setActive(id: PlayerId, isActive: boolean): Promise<Player>;
  subscribe(onChange: () => void): Unsubscribe;
}

export interface BoardgameRepository {
  list(): Promise<Boardgame[]>;
  get(id: BoardgameId): Promise<Boardgame | null>;
  create(input: NewBoardgame): Promise<Boardgame>;
  update(id: BoardgameId, patch: BoardgameUpdate): Promise<Boardgame>;
  remove(id: BoardgameId): Promise<void>;
  /** Uploads a logo image and returns its public URL. */
  uploadLogo(file: File): Promise<string>;
  subscribe(onChange: () => void): Unsubscribe;
}

export interface ConfigRepository {
  /** The fixed template describing the fields for a boardgame. */
  getTemplate(boardgameId: BoardgameId): Promise<ConfigTemplate | null>;
  listTemplates(): Promise<ConfigTemplate[]>;
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
  /** Defaults to ongoing games only when no filter is given. */
  list(filter?: { status?: GameStatus }): Promise<Game[]>;
  getPopulated(id: GameId): Promise<PopulatedGame | null>;
  create(input: NewGame): Promise<Game>;
  /** Records the elapsed (active) time for the current turn and rotates. */
  advanceTurn(id: GameId, elapsedSeconds: number): Promise<void>;
  /** Ends the game and marks the winner. */
  end(id: GameId, winnerId: PlayerId): Promise<void>;
  subscribe(onChange: () => void): Unsubscribe;
}

/** Aggregate of all repositories, resolved by the active adapter. */
export interface Repositories {
  players: PlayerRepository;
  boardgames: BoardgameRepository;
  configs: ConfigRepository;
  games: GameRepository;
}
