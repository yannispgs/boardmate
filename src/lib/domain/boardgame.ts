import type { BoardgameId } from "./ids";

/**
 * v1 only handles `competitive` games, but the field exists so cooperative /
 * hybrid games can be added later without a schema change.
 */
export type BoardgameKind = "competitive" | "cooperative" | "hybrid";

/** Who wins on score: the highest total, or the lowest (Skyjo/Papayoo). */
export type ScoreWinnerBy = "highest" | "lowest";

/**
 * How a boardgame is scored — inherent to the game, authored per boardgame.
 * `null` on the boardgame means the game isn't scored (pick the winner by hand).
 * v1 handles only `timing: "final"` + `entry: "total"`: one total entered per
 * player at the end. `live` scoring and multi-`categories` come later.
 */
export interface ScoringSpec {
  timing: "final";
  entry: "total";
  winnerBy: ScoreWinnerBy;
}

export interface Boardgame {
  id: BoardgameId;
  name: string;
  /** Public URL of the logo stored in Supabase Storage, or null. */
  logoUrl: string | null;
  /** Hard limits allowed by the box. */
  minPlayers: number | null;
  maxPlayers: number | null;
  /** Recommended ("sweet spot") range, e.g. 2-8 allowed but best at 3-4. */
  recMinPlayers: number | null;
  recMaxPlayers: number | null;
  kind: BoardgameKind;
  avgDurationMin: number | null;
  tags: string[];
  /** How the game is scored, or `null` when it isn't. */
  scoring: ScoringSpec | null;
  /**
   * When false, the boardgame is hidden from selection lists but kept in the
   * database. Deactivate (instead of delete) once it has games, to preserve
   * history.
   */
  isActive: boolean;
  /**
   * True once at least one game has been played with this boardgame. Such a
   * boardgame can no longer be deleted (only deactivated), so the UI confirms
   * before hiding it.
   */
  hasGames: boolean;
  createdAt: string;
}

export interface NewBoardgame {
  name: string;
  logoUrl?: string | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  recMinPlayers?: number | null;
  recMaxPlayers?: number | null;
  kind?: BoardgameKind;
  avgDurationMin?: number | null;
  tags?: string[];
}

export type BoardgameUpdate = Partial<NewBoardgame>;
