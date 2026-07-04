import type { BoardgameId } from "./ids";

/**
 * v1 only handles `competitive` games, but the field exists so cooperative /
 * hybrid games can be added later without a schema change.
 */
export type BoardgameKind = "competitive" | "cooperative" | "hybrid";

/**
 * How the winner is decided by score:
 * - `highest` / `lowest`: best total wins (Cascadia/Wingspan ; Skyjo/Papayoo).
 * - `threshold`: first to reach a target wins (Catan). The target is the value
 *   of the config `field` (e.g. `pointsToWin`), falling back to that field's
 *   default in the boardgame's config template.
 */
export type WinCondition =
  | { type: "highest" }
  | { type: "lowest" }
  | { type: "threshold"; field: string };

/**
 * How a boardgame is scored — inherent to the game, authored per boardgame.
 * `null` on the boardgame means the game isn't scored (pick the winner by hand).
 * `timing`: `live` = a running score during play (auto-ends when a threshold is
 * reached) ; `final` = one total entered per player at the end. `entry` is
 * `total` for now (multi-`categories` later).
 */
export interface ScoringSpec {
  timing: "final" | "live";
  entry: "total";
  winCondition: WinCondition;
  /**
   * Whether a score can go below zero. Defaults to `false` (positive-only, e.g.
   * Catan): the live −/+ control then floors at 0. Set `true` for games where a
   * running total can be negative (some card games).
   */
  allowNegative?: boolean;
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
