import type {
  CategoryDef,
  CategorySubsection,
  ConfigValues,
  FieldSpec,
  PlayerId,
  ScoreSheetItem,
  WinCondition,
} from "@/lib/domain";

/** Which end of the score range wins. */
export type ScoreDirection = "highest" | "lowest";

/** True when a scoresheet item is a titled subsection (vs a standalone line). */
export function isSubsection(item: ScoreSheetItem): item is CategorySubsection {
  return "categories" in item;
}

/** Every scored line of a scoresheet, flattened across subsections + standalones. */
export function sheetCategories(sheet: ScoreSheetItem[]): CategoryDef[] {
  return sheet.flatMap(item => (isSubsection(item) ? item.categories : [item]));
}

/** Sums a player's per-category points over the sheet's categories (missing = 0). */
export function categoryTotal(
  sheet: ScoreSheetItem[],
  values: Record<string, number>,
): number {
  return sheetCategories(sheet).reduce(
    (sum, cat) => sum + (values[cat.key] ?? 0),
    0,
  );
}

/** A player's final standing: their total and 1-based rank (ties share a rank). */
export interface Ranked {
  playerId: PlayerId;
  total: number;
  rank: number;
}

/**
 * Ranks players by total, highest first, ties sharing a rank (1,2,2,4). Input
 * order breaks ties for a stable output. For the suspense reveal, walk the
 * result back to front (last place first).
 */
export function rankByTotal(
  entries: Array<{ playerId: PlayerId; total: number }>,
): Ranked[] {
  const sorted = [...entries].sort((a, b) => b.total - a.total);
  const ranked: Ranked[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const prev = ranked[i - 1];
    // Same total as the player above → share their rank, else 1-based position.
    const rank = prev && prev.total === sorted[i].total ? prev.rank : i + 1;

    ranked.push({ playerId: sorted[i].playerId, total: sorted[i].total, rank });
  }

  return ranked;
}

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
