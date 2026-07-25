import type { ScenarioSpec } from "@/lib/catan/scenario-spec";

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
  /**
   * The board the scenario is drawn from, when it was authored in the app
   * rather than shipped in code. A scenario carries this or a `boardKey`.
   */
  boardSpec: ScenarioSpec | null;
  sortOrder: number;
}

/** A scenario the editor creates: everything but the id the database mints. */
export interface NewExtensionScenario {
  extensionId: ExtensionId;
  name: string;
  targetScore: number | null;
  boardSpec: ScenarioSpec;
  sortOrder: number;
}

/** What the editor may change on an existing scenario. */
export interface ExtensionScenarioUpdate {
  name: string;
  targetScore: number | null;
  boardSpec: ScenarioSpec;
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
  /**
   * Stable handle for the extensions the code has to recognise by itself — the
   * board generator draws `catan-marins` scenarios. Null on the rest, which are
   * pure data the app never names.
   */
  key: string | null;
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
