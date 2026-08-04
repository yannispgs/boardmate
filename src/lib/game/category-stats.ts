/**
 * Aggregates category-scored games into point-distribution slices for the stats
 * charts: how a player's / a game's points split across the top level of the
 * scoresheet — its subsections when it has any (Cascadia's Animaux / Biomes /
 * Divers), its plain lines otherwise (Wingspan, Forêt Mixte) — and, inside a
 * subsection the game flagged `showDetail`, across its own lines. Only games
 * whose stored breakdown covers every category count. Pure: no vendor types,
 * unit-tested.
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

// Distinct hues handed out to whatever the top level of the sheet turns out to
// be — its subsections, or its lines when it has none. Eight of them: past that
// a donut is unreadable anyway, so repeating a hue costs nothing.
const PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#84cc16",
  "#f43f5e",
];
const DIVERS_COLOR = "#9ca3af";

/** The palette hue at `i`, wrapping round for a sheet longer than the palette. */
function paletteColor(i: number): string {
  return PALETTE[i % PALETTE.length];
}

/** A subsection (its category keys) or the "Divers" bundle of standalone lines. */
export interface CategoryGroup {
  label: string;
  keys: string[];
  color: string;
}

/**
 * The sheet's top-level groups: one per subsection (Animaux, Biomes…), then a
 * single "Divers" group gathering every standalone line (Cascadia's pine cones).
 *
 * A sheet with **no** subsection at all (Wingspan, Forêt Mixte) has no such top
 * level to speak of, so each of its lines becomes a group in its own right —
 * bundling them all into one "Divers" would draw a single full circle and say
 * nothing.
 */
export function categoryGroups(sheet: ScoreSheetItem[]): CategoryGroup[] {
  if (!sheet.some(isSubsection)) {
    return sheetCategories(sheet).map((c, i) => ({
      label: c.label,
      keys: [c.key],
      color: paletteColor(i),
    }));
  }

  const groups: CategoryGroup[] = [];
  const divers: string[] = [];
  let subIndex = 0;

  for (const item of sheet) {
    if (isSubsection(item)) {
      groups.push({
        label: item.label,
        keys: item.categories.map(c => c.key),
        color: paletteColor(subIndex),
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

/**
 * The subsections the game says are worth breaking down further (Cascadia:
 * "Animaux"), in sheet order — each one earns its own view in the charts.
 */
export function detailSubsections(
  sheet: ScoreSheetItem[],
): CategorySubsection[] {
  return sheet.filter(isSubsection).filter(s => s.showDetail === true);
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
  return categories.map((c, i) => ({
    label: c.label,
    // A game that named its own colours keeps them (Cascadia's animals); one
    // that didn't gets told apart by the palette rather than by nothing.
    color: c.colors?.[0] ?? paletteColor(i),
    value: mean(breakdowns, b => b[c.key] ?? 0),
  }));
}
