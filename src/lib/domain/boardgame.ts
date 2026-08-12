import type { BoardgameId } from "./ids";
import type { RoundGoal } from "./round-goal";
import type { TieBreakRule } from "./tie-break";

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
 * The board generators the app ships, named after the game they draw for. A
 * generator is written code — the rules of what a legal board looks like — so a
 * game can only point at one that exists.
 */
export type BoardGeneratorId = "catan";

/** What the board-generator picker offers, in the order it offers them. */
export const BOARD_GENERATORS: ReadonlyArray<{
  id: BoardGeneratorId;
  name: string;
}> = [{ id: "catan", name: "Catan" }];

/**
 * Reads a board generator out of a stored value. Anything the app cannot draw —
 * a generator dropped since, a hand-edited row — is no generator at all rather
 * than a step that would lead nowhere.
 */
export function toBoardGenerator(
  value: string | null,
): BoardGeneratorId | null {
  return BOARD_GENERATORS.some(g => g.id === value)
    ? (value as BoardGeneratorId)
    : null;
}

/**
 * What **stops** a game, when its own scoring is what stops it:
 * - `scoreTarget`: a score reaching a target ends the game there and then. The
 *   target is the value of the config `field` (e.g. `pointsToWin`), falling
 *   back to that field's default in the boardgame's config template.
 *
 * `null` — most games — means the scoring stops nothing: the game runs out its
 * rounds, or the table calls it.
 */
export type StopCondition = { type: "scoreTarget"; field: string };

/**
 * Which end of the score range takes the game: the biggest total (Catan,
 * Cascadia, Wingspan) or the smallest (Odin, Skyjo, Papayoo).
 *
 * Deliberately separate from {@link StopCondition}, because *stopping* and
 * *winning* are two questions. Most of the time the answers line up on their
 * own: whoever reaches a target is by definition the highest, so a game that
 * stops on a target and pays the highest needs to say nothing more (Catan).
 * Odin is the one that pulls them apart — reaching 15 ends the game and the
 * player who stayed lowest wins it.
 */
export type WinCondition = { type: "highest" } | { type: "lowest" };

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
  /**
   * Optional pictogram **replacing** the label on the score sheet, the way the
   * printed pad draws its lines instead of writing them out. Names one of the
   * drawings the app ships; anything else reads as no icon at all and the line
   * falls back to its text (see {@link isCategoryIconId}). The sheet carries a
   * legend spelling every icon out, since a drawing alone says nothing to
   * someone who doesn't know the game.
   */
  icon?: string;
  /**
   * Marks a line the game has **already counted**, so it is shown filled in and
   * read-only at the end instead of being asked for again. `stageGoals` sums
   * what each player scored on the end-of-stage goals, entered stage by stage
   * during play (Wingspan's « Objectifs de manche »).
   */
  derived?: "stageGoals";
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
  /**
   * When set, the stats charts offer an extra view splitting *this* subsection's
   * points across its own lines (Cascadia: which animal the points came from).
   * Off by default — a section only earns its own tab when the lines inside it
   * are worth comparing.
   */
  showDetail?: boolean;
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
 * `sheet` describes it) ; `pairs` = the players sit in a circle and each pile
 * of points is shared by two neighbours, a player's total being the product of
 * the two flanking his seat (Splito — see {@link scorePiles}).
 */
export interface ScoringSpec {
  timing: "final" | "live";
  entry: "total" | "categories" | "pairs";
  /**
   * What ends the game, when the scoring is what ends it. Omitted / `null` for
   * a game the rounds or the table stop (see {@link StopCondition}).
   */
  stopCondition?: StopCondition | null;
  winCondition: WinCondition;
  /**
   * Whether a score can go below zero. Defaults to `false` (positive-only, e.g.
   * Catan): the live −/+ control then floors at {@link minScore}. Set `true` for
   * games where a running total can be negative (some card games).
   */
  allowNegative?: boolean;
  /**
   * The score every player starts a live game at (Catan: 2, so nobody is left
   * unscored). Defaults to `0`. Ignored for `final` timing, where scores are
   * entered at the end.
   */
  startScore?: number;
  /**
   * The lowest a score may reach (Catan: 2 — you can't drop below your starting
   * settlements). Defaults to `0`. Overridden by {@link allowNegative}, which
   * removes the floor entirely. May differ from {@link startScore} for a game
   * that starts above its floor.
   */
  minScore?: number;
  /** The scoresheet, present when `entry` is `categories`. */
  sheet?: ScoreSheetItem[];
  /**
   * The game's own secondary rules, applied in order to separate players tied
   * on the final score. Omitted / empty means the rulebook has none: a tie is a
   * shared victory. See {@link resolveTieBreak}.
   */
  tieBreak?: TieBreakRule[];
}

/**
 * A game played in stages bigger than the lap of the table, and what its
 * rulebook calls one — Terraforming Mars' « Génération », Wingspan's
 * « Manche ». `label` is the progress label shown during play; `null` on the
 * boardgame means plain laps and nothing else, as most games are.
 *
 * `advance` is what *closes* a stage, and the three are genuinely different
 * games:
 * - `pass`: players step out one by one and the stage ends when the last one
 *   does, so the turns inside it are unequal and impossible to foresee.
 * - `schedule`: the stage lasts a counted number of laps; everyone still plays
 *   exactly once per lap, and the end is known before anyone sits down.
 * - `manual`: the table closes the stage itself, whenever the cards say so
 *   (Odin: someone empties his hand). Nothing counts the turns inside it and
 *   nobody knows how many stages the game will run, so such a stage is the
 *   game's only unit of progress — and the points entered as it closes are the
 *   game's own scores, summed as the stages go by.
 */
export type StageAdvance = "pass" | "schedule" | "manual";

export interface StageSpec {
  label: string;
  advance: StageAdvance;
  /**
   * Laps per stage for a `schedule` game, in order (Wingspan: `[8, 7, 6, 5]`).
   * The **base** calendar only: what a game actually plays is settled at setup,
   * since a goal tile can lengthen the stages that follow it (see
   * `RoundGoal.extraTurn`), and is then recorded per game.
   */
  schedule?: number[];
  /**
   * The most one player can score on a single stage, when the rules cap it —
   * Odin: 9, the hand you are dealt. You lay at least one card and take at most
   * one back, so a hand never grows and nine is everything you could still be
   * holding. Omitted when nothing caps a stage.
   */
  maxPoints?: number;
}

/** One claimable milestone: what it is called and what it takes to claim it. */
export interface Milestone {
  key: string;
  label: string;
  /** The rulebook's condition, read at the table before claiming. */
  hint: string;
  /**
   * Optional pictogram shown **beside** the name — not instead of it, unlike a
   * scored line: five milestones are told apart at a glance by their drawing,
   * but the name is what somebody says out loud when he takes one. Names one of
   * the drawings the app ships; anything else reads as no icon at all (see
   * {@link isCategoryIconId}).
   */
  icon?: string;
  /**
   * Optional colour for that drawing (`#rgb` / `#rrggbb`), so five line drawings
   * are told apart by more than their shape at 28 pixels. Anything else is
   * ignored and the drawing takes the panel's own colour — the icons stay
   * single-colour either way, which is what lets them sit on a dark background
   * without a second set.
   */
  color?: string;
}

/**
 * Milestones a player claims **during** the game, first come first served, each
 * worth a fixed number of points to whoever took it (Terraforming Mars: 5 of
 * them offered, 3 claimable, 5 VP each).
 *
 * It is a catalogue rather than code because it is not stable — Venus Next adds
 * a sixth, and the Hellas and Elysium boards replace all five.
 *
 * `null` means the game has none, which is every game but one today.
 */
export interface MilestoneSpec {
  /** What the rulebook calls one, singular (« Jalon »). */
  label: string;
  /** Points a claimed milestone is worth its claimer. */
  points: number;
  /** How many of the catalogue one game may claim in total. */
  max: number;
  /** The scoresheet line the claims fill in, by `ScoreSheetItem` key. */
  scoreKey: string;
  catalogue: Milestone[];
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
   * How this game is played in generations, or `null` for a game turning in
   * plain laps. Reference data, authored in migrations — the boardgame editor
   * doesn't offer it, because it changes how turns rotate.
   */
  stages: StageSpec | null;
  /**
   * The milestones this game offers, or `null` when it offers none. Reference
   * data, authored in migrations — the boardgame editor doesn't offer it, for
   * the same reason as `stages`: it is the rulebook, not a preference.
   */
  milestones: MilestoneSpec | null;
  /**
   * The end-of-stage goal tiles this game can be set up with (Wingspan). Empty
   * for every game played without stages; extensions add their own tiles to it.
   */
  roundGoals: RoundGoal[];
  /**
   * Whether the stats should break results down by turn order — first / middle
   * / last to play — for games where playing order matters (Catan). Off by
   * default.
   */
  trackSeatStats: boolean;
  /**
   * Whether a game can end mid-lap, leaving some players one turn short of the
   * others (Forêt Mixte stops the moment the third winter card is drawn). Turns
   * on a points-per-turn reading on the end-of-game stats; purely informative,
   * it never touches the winner, the ranking or the tie-break.
   */
  turnCountVaries: boolean;
  /**
   * The generator that draws a board for this game, offered as a step of the
   * new-game funnel; `null` for a game played on no generated board.
   */
  boardGenerator: BoardGeneratorId | null;
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
  /** Players may not all get the same number of turns (random end trigger). */
  turnCountVaries?: boolean;
  /** The generator that draws this game's board, or `null` for none. */
  boardGenerator?: BoardGeneratorId | null;
}

export type BoardgameUpdate = Partial<NewBoardgame>;
