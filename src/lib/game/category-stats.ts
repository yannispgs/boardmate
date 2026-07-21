/**
 * Aggregates category-scored games (Cascadia) into point-distribution slices
 * for the stats charts: how a player's / a game's points split across category
 * groups (Animaux / Biomes / Divers) and, within a group, across its lines
 * (the animal types). Only games whose stored breakdown covers every category
 * count. Pure: no vendor types, unit-tested.
 */
import type {
  CategoryDef,
  CategorySubsection,
  GameStatsRecord,
  PlayerId,
  ScoreSheetItem,
} from "@/lib/domain";
import { isSubsection, sheetCategories } from "@/lib/game/scoring";

/** One wedge of a distribution: a label, its mean points, and a colour. */
export interface Slice {
  label: string;
  value: number;
  color: string;
}

// Distinct hues for the top-level GROUPS (subsections); standalones are grey.
const GROUP_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];
const DIVERS_COLOR = "#9ca3af";

/** A subsection (its category keys) or the "Divers" bundle of standalone lines. */
export interface CategoryGroup {
  label: string;
  keys: string[];
  color: string;
}

/**
 * The sheet's top-level groups: one per subsection (Animaux, Biomes…), then a
 * single "Divers" group gathering every standalone line (Cascadia's pine cones).
 */
export function categoryGroups(sheet: ScoreSheetItem[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  const divers: string[] = [];
  let subIndex = 0;

  for (const item of sheet) {
    if (isSubsection(item)) {
      groups.push({
        label: item.label,
        keys: item.categories.map(c => c.key),
        color: GROUP_COLORS[subIndex % GROUP_COLORS.length],
      });
      subIndex++;
    } else {
      divers.push(item.key);
    }
  }

  if (divers.length > 0) {
    groups.push({ label: "Divers", keys: divers, color: DIVERS_COLOR });
  }

  return groups;
}

/** The first subsection of a sheet (Cascadia: "Animaux"), or null if there's none. */
export function firstSubsection(
  sheet: ScoreSheetItem[],
): CategorySubsection | null {
  return sheet.find(isSubsection) ?? null;
}

/** True when a breakdown carries a value for every category of the sheet. */
export function hasCompleteBreakdown(
  sheet: ScoreSheetItem[],
  breakdown: Record<string, number> | null,
): boolean {
  if (!breakdown) {
    return false;
  }

  return sheetCategories(sheet).every(c => c.key in breakdown);
}

/**
 * Every complete per-category breakdown across the games — of one player when
 * `playerId` is given, otherwise of all participants.
 */
export function completeBreakdowns(
  records: GameStatsRecord[],
  sheet: ScoreSheetItem[],
  playerId?: PlayerId,
): Record<string, number>[] {
  const out: Record<string, number>[] = [];

  for (const record of records) {
    for (const p of record.players) {
      if (playerId && p.playerId !== playerId) {
        continue;
      }

      const breakdown = p.scoreBreakdown ?? null;

      if (hasCompleteBreakdown(sheet, breakdown)) {
        out.push(breakdown as Record<string, number>);
      }
    }
  }

  return out;
}

/** Mean of `f` over the breakdowns (0 when there are none). */
function mean(
  breakdowns: Record<string, number>[],
  f: (b: Record<string, number>) => number,
): number {
  if (breakdowns.length === 0) {
    return 0;
  }

  return breakdowns.reduce((sum, b) => sum + f(b), 0) / breakdowns.length;
}

/** Mean points per GROUP (Animaux / Biomes / Divers) over the breakdowns. */
export function groupSlices(
  sheet: ScoreSheetItem[],
  breakdowns: Record<string, number>[],
): Slice[] {
  return categoryGroups(sheet).map(g => ({
    label: g.label,
    color: g.color,
    value: mean(breakdowns, b => g.keys.reduce((s, k) => s + (b[k] ?? 0), 0)),
  }));
}

/** Mean points per CATEGORY of a group over the breakdowns (each its own colour). */
export function categorySlices(
  categories: CategoryDef[],
  breakdowns: Record<string, number>[],
): Slice[] {
  return categories.map(c => ({
    label: c.label,
    color: c.colors?.[0] ?? DIVERS_COLOR,
    value: mean(breakdowns, b => b[c.key] ?? 0),
  }));
}
