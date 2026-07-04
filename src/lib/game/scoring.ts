import type {
  ConfigValues,
  FieldSpec,
  PlayerId,
  WinCondition,
} from "@/lib/domain";

/** Which end of the score range wins. */
export type ScoreDirection = "highest" | "lowest";

/** The direction a win condition ranks by (a threshold is a race to the top). */
export function winnerDirection(condition: WinCondition): ScoreDirection {
  return condition.type === "lowest" ? "lowest" : "highest";
}

/**
 * The leading player by score in the given direction. Players with no score yet
 * are ignored; a tie keeps the first among the leaders (the end-of-game form
 * lets the user override). Returns null when nobody has a score.
 */
export function leaderByScore(
  entries: Array<{ playerId: PlayerId; score: number | null }>,
  direction: ScoreDirection,
): PlayerId | null {
  let leader: { playerId: PlayerId; score: number } | null = null;

  for (const e of entries) {
    if (e.score === null) {
      continue;
    }

    if (
      leader === null ||
      (direction === "highest"
        ? e.score > leader.score
        : e.score < leader.score)
    ) {
      leader = { playerId: e.playerId, score: e.score };
    }
  }

  return leader?.playerId ?? null;
}

/**
 * The first player to have reached the target (score ≥ threshold), or null —
 * the winner of a live threshold game.
 */
export function reachedThreshold(
  entries: Array<{ playerId: PlayerId; score: number | null }>,
  threshold: number,
): PlayerId | null {
  for (const e of entries) {
    if (e.score !== null && e.score >= threshold) {
      return e.playerId;
    }
  }

  return null;
}

/**
 * Resolves a threshold win condition's target: the game's config value for the
 * referenced field, else that field's default in the config template. Null for
 * non-threshold conditions or when nothing supplies a number.
 */
export function winThresholdFrom(
  condition: WinCondition,
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
): number | null {
  if (condition.type !== "threshold") {
    return null;
  }

  const fromConfig = configValues?.[condition.field];
  if (typeof fromConfig === "number") {
    return fromConfig;
  }

  const spec = templateFields.find(f => f.key === condition.field);
  const fallback =
    spec && "default" in spec
      ? (spec as { default?: unknown }).default
      : undefined;

  return typeof fallback === "number" ? fallback : null;
}
