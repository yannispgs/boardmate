import type { PlayerId } from "./ids";

/**
 * Where the value a tie-break rule ranks on comes from:
 * - `currentTurn`: the app already knows it — the player whose turn it is when
 *   the game ends (Catan's « celui dont c'est le tour »). Nothing to ask.
 * - `ask`: the app has no way to know (leftover food, nature tokens…), so the
 *   table enters one number per tied player at game end.
 */
export type TieBreakSource = "currentTurn" | "ask";

/**
 * One secondary rule of a boardgame, applied — in order — to separate players
 * tied on the final score. Authored per boardgame alongside the scoring spec;
 * never editable from the app, because it *is* the rulebook.
 */
export interface TieBreakRule {
  /** Stable identifier, persisted with the game (e.g. `natureTokens`). */
  key: string;
  /** French label shown in the score recap ("Le plus de jetons nature"). */
  label: string;
  /** Which end of the entered value wins. Defaults to `highest`. */
  direction?: "highest" | "lowest";
  /** How the value is obtained. */
  source: TieBreakSource;
  /** Hint shown next to the inputs when the table has to enter the values. */
  help?: string;
}

/** One rule that was actually applied, with the values it ranked on. */
export interface TieBreakStep {
  key: string;
  label: string;
  /** The value used per player id — entered by the table or derived. */
  values: Record<string, number>;
  /** Who was still tied *after* this rule. */
  survivors: PlayerId[];
}

/**
 * What separated (or failed to separate) the players tied on the best score —
 * persisted with the game and replayed in the score recap. Absent on a game with
 * a clear single leader.
 */
export interface TieBreakRecord {
  /** The players tied on the best score, before any rule was applied. */
  tied: PlayerId[];
  /** The rules applied, in order. Empty when the game has none. */
  steps: TieBreakStep[];
  /** True when no rule separated them — the victory is shared. */
  shared: boolean;
}
