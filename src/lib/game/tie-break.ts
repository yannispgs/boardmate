import type {
  PlayerId,
  TieBreakRecord,
  TieBreakRule,
  TieBreakStep,
} from "@/lib/domain";

import type { ScoreDirection } from "./scoring";

/** Context the resolver reads the non-asked values from. */
export interface TieBreakContext {
  /**
   * Whose turn it was when the game ended — the value behind a `currentTurn`
   * rule (Catan). Null when unknown; the rule then separates nobody.
   */
  currentPlayerId?: PlayerId | null;
  /**
   * What the table entered, keyed by rule then by player id. A rule is only
   * applied once every tied player has a value.
   */
  answers?: Record<string, Record<string, number>>;
}

export interface TieBreakResult {
  /** The players tied on the best score, in input order (1 = no tie). */
  tied: PlayerId[];
  /** The rules applied so far, in order. */
  steps: TieBreakStep[];
  /**
   * The next rule whose values the table still has to enter, or null when the
   * outcome is settled. While set, `winners` is empty.
   */
  pending: TieBreakRule | null;
  /** The players still tied when `pending` is set — who to ask about. */
  asking: PlayerId[];
  /** The winner, or several of them on a shared victory. Empty while pending. */
  winners: PlayerId[];
  /** True when the rules ran out and several players are still level. */
  shared: boolean;
}

/** Joins names the French way: "Alice", "Alice et Bob", "Alice, Bob et Chloé". */
export function formatNames(names: string[]): string {
  if (names.length <= 1) {
    return names.join("");
  }

  return `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
}

/** The players sharing the best score, in input order. */
function leadersOf(
  entries: Array<{ playerId: PlayerId; score: number }>,
  direction: ScoreDirection,
): PlayerId[] {
  if (entries.length === 0) {
    return [];
  }

  const best = entries.reduce((acc, e) => {
    const better = direction === "highest" ? e.score > acc : e.score < acc;

    return better ? e.score : acc;
  }, entries[0].score);

  return entries.filter(e => e.score === best).map(e => e.playerId);
}

/** The values a rule ranks the still-tied players on, or null when unavailable. */
function valuesFor(
  rule: TieBreakRule,
  tied: PlayerId[],
  ctx: TieBreakContext,
): Record<string, number> | null {
  if (rule.source === "currentTurn") {
    // The player holding the turn scores 1, everyone else 0. An unknown (or
    // eliminated) current player leaves everyone at 0 — the rule decides nothing.
    return Object.fromEntries(
      tied.map(id => [id, id === ctx.currentPlayerId ? 1 : 0]),
    );
  }

  const answers = ctx.answers?.[rule.key];

  if (!answers || tied.some(id => typeof answers[id] !== "number")) {
    return null;
  }

  return Object.fromEntries(tied.map(id => [id, answers[id]]));
}

/** The players holding the winning value of a rule. */
function bestOf(
  tied: PlayerId[],
  values: Record<string, number>,
  direction: ScoreDirection,
): PlayerId[] {
  const scores = tied.map(id => values[id]);
  const best =
    direction === "highest" ? Math.max(...scores) : Math.min(...scores);

  return tied.filter(id => values[id] === best);
}

/**
 * Applies a boardgame's secondary rules to the players tied on the best score.
 * Rules run in order, each narrowing the survivors; the first that separates
 * them decides. A rule whose values the table still has to enter stops the
 * resolution and is returned as `pending`. When every rule has run and several
 * players are still level, the victory is **shared** — they all win.
 *
 * A single leader short-circuits: no rule is applied and `tied` holds them alone.
 */
export function resolveTieBreak(
  entries: Array<{ playerId: PlayerId; score: number }>,
  direction: ScoreDirection,
  rules: TieBreakRule[],
  ctx: TieBreakContext = {},
): TieBreakResult {
  const tied = leadersOf(entries, direction);

  if (tied.length <= 1) {
    return {
      tied,
      steps: [],
      pending: null,
      asking: [],
      winners: tied,
      shared: false,
    };
  }

  const steps: TieBreakStep[] = [];
  let survivors = tied;

  for (const rule of rules) {
    const values = valuesFor(rule, survivors, ctx);

    if (values === null) {
      return {
        tied,
        steps,
        pending: rule,
        asking: survivors,
        winners: [],
        shared: false,
      };
    }

    survivors = bestOf(survivors, values, rule.direction ?? "highest");
    steps.push({ key: rule.key, label: rule.label, values, survivors });

    if (survivors.length === 1) {
      break;
    }
  }

  return {
    tied,
    steps,
    pending: null,
    asking: [],
    winners: survivors,
    shared: survivors.length > 1,
  };
}

/**
 * The record to persist with the game, or `null` when there was nothing to
 * separate (a single leader) — nothing worth showing in the recap then.
 */
export function tieBreakRecord(result: TieBreakResult): TieBreakRecord | null {
  if (result.tied.length <= 1) {
    return null;
  }

  return { tied: result.tied, steps: result.steps, shared: result.shared };
}

/**
 * Whether a tie-break record still holds after the table overrode the winners by
 * hand: the applied rules only explain the outcome they produced. Forcing a
 * different winner set drops the steps but keeps who was tied, so the recap can
 * still say the game ended level.
 */
export function recordForWinners(
  record: TieBreakRecord | null,
  winners: PlayerId[],
): TieBreakRecord | null {
  if (record === null) {
    return null;
  }

  const decided = record.steps.at(-1)?.survivors ?? record.tied;
  const matches =
    decided.length === winners.length &&
    decided.every(id => winners.includes(id));

  if (matches) {
    return { ...record, shared: winners.length > 1 };
  }

  return { tied: record.tied, steps: [], shared: winners.length > 1 };
}
