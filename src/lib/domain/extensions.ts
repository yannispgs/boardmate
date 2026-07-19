import type { ScoreSheetItem } from "./boardgame";
import type { FieldSpec } from "./config";
import type { BoardgameId, ExtensionId, ExtensionScenarioId } from "./ids";

/** What an extension appends to a base game's scoresheet. */
export interface ScoringDelta {
  appendSheet?: ScoreSheetItem[];
}

/** One scenario of a scenario-based extension (e.g. a Catan Marins scenario). */
export interface ExtensionScenario {
  id: ExtensionScenarioId;
  extensionId: ExtensionId;
  name: string;
  /** Hard-coded base score to reach (read-only in the app), or null. */
  targetScore: number | null;
  /** Key the board generator reads to build this scenario's board. */
  boardKey: string | null;
  sortOrder: number;
}

/**
 * An extension of a base boardgame. Several can be active on one played game and
 * **compose**: their `configFields` merge onto the base config template (by
 * key), their `scoringDelta` appends to the base scoresheet, and their
 * `targetModifier` raises the win target (never lowers it). Scenario-based
 * extensions (Marins) set the base target on the chosen scenario instead.
 */
export interface Extension {
  id: ExtensionId;
  baseGameId: BoardgameId;
  name: string;
  configFields: FieldSpec[];
  scoringDelta: ScoringDelta | null;
  /** Additive, non-negative modifier to the win target. */
  targetModifier: number;
  hasScenarios: boolean;
  changesBoard: boolean;
  isActive: boolean;
  sortOrder: number;
  /** The scenarios, ordered; empty unless `hasScenarios`. */
  scenarios: ExtensionScenario[];
}
