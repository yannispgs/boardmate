import type { BoardgameId } from "./ids";

/**
 * v1 only handles `competitive` games, but the field exists so cooperative /
 * hybrid games can be added later without a schema change.
 */
export type BoardgameKind = "competitive" | "cooperative" | "hybrid";

/**
 * How turns flow:
 * - `sequential`: players take individual turns in seat order (the default —
 *   Catan, Cascadia…). A round is one lap of the table.
 * - `simultaneous`: everyone plays at once each round (Splito). There is no
 *   per-player turn; a round is a single shared turn, and "Tour suivant"
 *   advances the whole round.
 */
export type TurnMode = "sequential" | "simultaneous";

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

/** One scored line on a final scoresheet (e.g. an animal in Cascadia). */
export interface CategoryDef {
  key: string;
  label: string;
  /**
   * Optional identifying colours (hex), shown as a dot next to the label. One
   * colour → a solid dot; several → an evenly split dot (e.g. Cascadia's
   * two-tone biomes).
   */
  colors?: string[];
}

/** A titled group of scored lines (e.g. "Animaux"), for the final scoresheet. */
export interface CategorySubsection {
  label: string;
  categories: CategoryDef[];
  /**
   * When set, each line in this subsection is *ranked* across players and the
   * leaders earn placement points on top of what was entered (e.g. Cascadia's
   * biomes). The array is the award per place, best first — `[3, 1]` means 3 to
   * the 1st, 1 to the 2nd, nothing lower. Ties split the awards of the places
   * they occupy, floored (see {@link rankBonusFor}).
   */
  rankBonus?: number[];
}

/**
 * One item of a category scoresheet, self-describing by shape:
 * - `{ label, categories }` → a titled **subsection** of lines.
 * - `{ label, key }` → a **standalone** scored line (e.g. Cascadia's pine cones).
 */
export type ScoreSheetItem = CategorySubsection | CategoryDef;

/**
 * How a boardgame is scored — inherent to the game, authored per boardgame.
 * `null` on the boardgame means the game isn't scored (pick the winner by hand).
 * `timing`: `live` = a running score during play (auto-ends when a threshold is
 * reached) ; `final` = entered at the end. `entry`: `total` = one total per
 * player ; `categories` = a per-category scoresheet summed into the total (the
 * `sheet` describes it).
 */
export interface ScoringSpec {
  timing: "final" | "live";
  entry: "total" | "categories";
  winCondition: WinCondition;
  /**
   * Whether a score can go below zero. Defaults to `false` (positive-only, e.g.
   * Catan): the live −/+ control then floors at 0. Set `true` for games where a
   * running total can be negative (some card games).
   */
  allowNegative?: boolean;
  /** The scoresheet, present when `entry` is `categories`. */
  sheet?: ScoreSheetItem[];
}

/**
 * Dice this game rolls, when roll tracking is enabled. `count` dice of `sides`
 * faces each, summed — so a roll ranges `count`..`count * sides` (Catan: 2 × d6
 * → 2–12). `null` on the boardgame means no dice tracking.
 */
export interface DiceSpec {
  count: number;
  sides: number;
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
  /** Sequential turns (default) or everyone-plays-at-once (Splito). */
  turnMode: TurnMode;
  avgDurationMin: number | null;
  tags: string[];
  /** How the game is scored, or `null` when it isn't. */
  scoring: ScoringSpec | null;
  /**
   * Fixed number of rounds after which the game ends automatically (e.g.
   * Cascadia's 20), or `null` for an open-ended game (ends by threshold or by
   * hand).
   */
  roundLimit: number | null;
  /** Dice for in-game roll tracking (Catan), or `null` when not tracked. */
  dice: DiceSpec | null;
  /**
   * Whether the stats should break results down by turn order — first / middle
   * / last to play — for games where playing order matters (Catan). Off by
   * default.
   */
  trackSeatStats: boolean;
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
  turnMode?: TurnMode;
  avgDurationMin?: number | null;
  tags?: string[];
  /** How the game is scored, or `null` when it isn't. */
  scoring?: ScoringSpec | null;
  /** Fixed number of rounds after which the game ends, or `null`. */
  roundLimit?: number | null;
  /** Dice for in-game roll tracking, or `null`. */
  dice?: DiceSpec | null;
  /** Break the stats down by turn order (first / middle / last). */
  trackSeatStats?: boolean;
}

export type BoardgameUpdate = Partial<NewBoardgame>;
