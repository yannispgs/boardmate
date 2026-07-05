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

/**
 * Placement points for one ranked line (e.g. a Cascadia biome), from each
 * player's entered value. Players are ranked highest first; a group of tied
 * players occupies consecutive places and each member gets the *floored average*
 * of those places' awards. `awards` is best-first (`[3, 1]` = 3 to 1st, 1 to
 * 2nd). A player with nothing there (value ≤ 0) is ineligible and earns 0.
 *
 * Returns the bonus per player, in the same order as `values`. Examples with
 * `[3, 1]`: two players tied 1st → `(3 + 1) / 2 = 2` each; one leader then two
 * tied 2nd → 3 for the leader, `⌊1 / 2⌋ = 0` for the pair.
 */
export function rankBonusFor(values: number[], awards: number[]): number[] {
  const bonus = new Array<number>(values.length).fill(0);
  const eligible = values
    .map((v, i) => ({ v, i }))
    .filter(e => e.v > 0)
    .sort((a, b) => b.v - a.v);

  let place = 0; // 0-based place cursor among the eligible players

  for (let k = 0; k < eligible.length; ) {
    let j = k;
    while (j < eligible.length && eligible[j].v === eligible[k].v) {
      j++;
    }

    const size = j - k;
    let sum = 0;
    for (let p = place; p < place + size; p++) {
      sum += awards[p] ?? 0;
    }

    const share = Math.floor(sum / size);
    for (let m = k; m < j; m++) {
      bonus[eligible[m].i] = share;
    }

    place += size;
    k = j;
  }

  return bonus;
}

/** A player's category score split into entered points, ranking bonus and total. */
export interface CategoryScore {
  /** Sum of the values entered across every category. */
  raw: number;
  /** Placement points earned across the ranked subsections. */
  bonus: number;
  /** `raw + bonus` — what the player is ranked on. */
  total: number;
}

/**
 * Scores every player from the filled scoresheet: the entered points plus the
 * ranking bonus of each `rankBonus` subsection (ranked line by line across all
 * players). Keyed by player id.
 */
export function scoreCategories(
  sheet: ScoreSheetItem[],
  valuesByPlayer: Record<string, Record<string, number>>,
  playerIds: PlayerId[],
): Record<string, CategoryScore> {
  const result: Record<string, CategoryScore> = {};

  for (const id of playerIds) {
    const raw = categoryTotal(sheet, valuesByPlayer[id] ?? {});
    result[id] = { raw, bonus: 0, total: raw };
  }

  for (const item of sheet) {
    if (!isSubsection(item) || !item.rankBonus) {
      continue;
    }

    for (const cat of item.categories) {
      const values = playerIds.map(id => valuesByPlayer[id]?.[cat.key] ?? 0);
      const bonuses = rankBonusFor(values, item.rankBonus);

      playerIds.forEach((id, idx) => {
        result[id].bonus += bonuses[idx];
      });
    }
  }

  for (const id of playerIds) {
    result[id].total = result[id].raw + result[id].bonus;
  }

  return result;
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
