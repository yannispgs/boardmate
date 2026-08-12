import type {
  CategoryDef,
  CategorySubsection,
  ConfigValues,
  FieldSpec,
  PlayerId,
  ScoreSheetItem,
  ScoringSpec,
  StopCondition,
  WinCondition,
} from "@/lib/domain";

/** Which end of the score range wins. */
export type ScoreDirection = "highest" | "lowest";

/**
 * The score each player should start a live-scored game at, so nobody is ever
 * left unscored (Catan: 2). `null` when the game isn't live-scored — final
 * scoring is entered at the end, not seeded.
 */
export function initialScoreFor(scoring: ScoringSpec | null): number | null {
  if (scoring?.timing !== "live") {
    return null;
  }

  return scoring.startScore ?? 0;
}

/**
 * The lowest a live score may reach, or `null` when there is no floor
 * (`allowNegative`). Defaults to `0` for positive-only games (Catan: `minScore`
 * 2).
 */
export function scoreFloor(scoring: ScoringSpec | null): number | null {
  if (!scoring || scoring.allowNegative) {
    return null;
  }

  return scoring.minScore ?? 0;
}

/** Rounds a live score and clamps it to the game's floor (see {@link scoreFloor}). */
export function clampScore(value: number, scoring: ScoringSpec | null): number {
  const rounded = Math.round(value);
  const floor = scoreFloor(scoring);

  return floor !== null && rounded < floor ? floor : rounded;
}

/** True when a scoresheet item is a titled subsection (vs a standalone line). */
export function isSubsection(item: ScoreSheetItem): item is CategorySubsection {
  return "categories" in item;
}

/** Every scored line of a scoresheet, flattened across subsections + standalones. */
export function sheetCategories(sheet: ScoreSheetItem[]): CategoryDef[] {
  return sheet.flatMap(item => (isSubsection(item) ? item.categories : [item]));
}

/**
 * The keys of the lines the game counts itself, so the end-of-game sheet shows
 * them filled in instead of asking for them again (see `CategoryDef.derived`).
 * Only the play screen reads them: the same sheet used to record a game played
 * away from the app has nothing to derive from, and stays fully typed by hand.
 */
export function derivedKeys(
  sheet: ScoreSheetItem[],
  kind: "stageGoals",
): string[] {
  return sheetCategories(sheet)
    .filter(cat => cat.derived === kind)
    .map(cat => cat.key);
}

/**
 * Merges prefilled scoresheet cells from several sources — the milestones taken
 * during play, the manche goals counted as they closed. Cells are merged player
 * by player rather than replaced, and a later source wins a shared one.
 */
export function mergePrefill(
  parts: Array<Record<string, Record<string, string>>>,
): Record<string, Record<string, string>> {
  const merged: Record<string, Record<string, string>> = {};

  for (const part of parts) {
    for (const [playerId, cells] of Object.entries(part)) {
      merged[playerId] = { ...merged[playerId], ...cells };
    }
  }

  return merged;
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
    const rank = prev?.total === sorted[i].total ? prev.rank : i + 1;

    ranked.push({ playerId: sorted[i].playerId, total: sorted[i].total, rank });
  }

  return ranked;
}

/**
 * Ranks players by their final score in the given direction (highest- or
 * lowest-wins), ties sharing a rank (1,2,2,4). Input order breaks ties for a
 * stable output. Unlike {@link rankByTotal} (category totals, always highest),
 * this honours a game's win direction — the finished-game score panel uses it.
 */
export function rankFinalScores(
  entries: Array<{ playerId: PlayerId; score: number }>,
  direction: ScoreDirection,
): Ranked[] {
  const sorted = [...entries].sort((a, b) =>
    direction === "highest" ? b.score - a.score : a.score - b.score,
  );
  const ranked: Ranked[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const prev = ranked[i - 1];
    // Same score as the player above → share their rank, else 1-based position.
    const rank = prev?.total === sorted[i].score ? prev.rank : i + 1;

    ranked.push({ playerId: sorted[i].playerId, total: sorted[i].score, rank });
  }

  return ranked;
}

/**
 * Final standings for the finished-game score panel. The recorded winners take
 * rank 1 — one of them normally, several on a shared victory (ex æquo the
 * tie-break rules couldn't separate) — and everyone else is ranked by score
 * below them: a co-leader on the same score who lost the tie-break is 2nd, not a
 * shared 1st. Ties from 2nd place down still share a rank. Falls back to plain
 * {@link rankFinalScores} when nobody won, or when everybody did (cooperative
 * games: the whole table wins or loses together).
 */
export function finalStandings(
  entries: Array<{ playerId: PlayerId; score: number; isWinner: boolean }>,
  direction: ScoreDirection,
): Ranked[] {
  const winners = entries.filter(e => e.isWinner);

  if (winners.length === 0 || winners.length === entries.length) {
    return rankFinalScores(entries, direction);
  }

  const top = winners.map(w => ({
    playerId: w.playerId,
    total: w.score,
    rank: 1,
  }));
  // Rank the others among themselves, then shift below the whole winning group.
  const rest = rankFinalScores(
    entries.filter(e => !e.isWinner),
    direction,
  ).map(r => ({ ...r, rank: r.rank + winners.length }));

  return [...top, ...rest];
}

/**
 * The direction a win condition ranks by — which end of the range takes it.
 * A seam of its own, rather than reading `condition.type` at each call site, so
 * a win condition that isn't a plain direction stays possible.
 */
export function winnerDirection(condition: WinCondition): ScoreDirection {
  return condition.type;
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
 * Resolves the score a stop condition is aiming at: the game's config value for
 * the referenced field, else that field's default in the config template. Null
 * for a game nothing stops, or when neither supplies a number.
 */
export function stopTargetFrom(
  condition: StopCondition | null | undefined,
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
): number | null {
  if (!condition) {
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

/**
 * What the game's *options* add to the score to reach: every boolean config
 * field that is switched on contributes its `targetModifier` (Catan's « Maître
 * du port » = +1). Falls back to each field's default when the game didn't
 * store a value. Only positive modifiers count.
 */
export function optionTargetModifier(
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
): number {
  let bonus = 0;

  for (const field of templateFields) {
    if (field.type !== "boolean" || field.targetModifier === undefined) {
      continue;
    }

    const value = configValues?.[field.key] ?? field.default;

    if (value === true) {
      bonus += Math.max(0, field.targetModifier);
    }
  }

  return bonus;
}
