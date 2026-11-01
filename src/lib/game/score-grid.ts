/**
 * A category sheet counted card by card, laid out as the cards lie on the
 * table (Symbiose's mare: 2 rows of 4). Each zone's cells add up to one line
 * of the sheet, and only the lines are recorded — so the grid is a way of
 * counting, not a new kind of score.
 *
 * A player's cells are held zone after zone, each zone row by row.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { ScoreGrid, ScoreSheetItem } from "@/lib/domain";

import { sheetCategories } from "./scoring";

/** How many cells one zone holds. */
export function zoneSize(grid: ScoreGrid, zone: number): number {
  return grid.rows * (grid.zones[zone]?.columns ?? 0);
}

/** Where a zone's cells start among a player's. */
export function zoneOffset(grid: ScoreGrid, zone: number): number {
  return grid.zones
    .slice(0, zone)
    .reduce((sum, _z, i) => sum + zoneSize(grid, i), 0);
}

/** How many cells a player fills in. */
export function cellCount(grid: ScoreGrid): number {
  return zoneOffset(grid, grid.zones.length);
}

/**
 * The grid, when it still fits the sheet: every zone a line of it and every
 * line a zone. A sheet edited since — a line renamed away, one added — falls
 * back to being counted line by line rather than losing a line.
 */
export function usableGrid(
  sheet: readonly ScoreSheetItem[],
  grid: ScoreGrid | undefined,
): ScoreGrid | null {
  if (grid === undefined || grid.rows < 1 || grid.zones.length === 0) {
    return null;
  }

  const lines = sheetCategories([...sheet]).map(c => c.key);
  const zones = new Set(grid.zones.map(z => z.category));
  const fits =
    grid.zones.every(z => z.columns >= 1 && lines.includes(z.category)) &&
    lines.every(key => zones.has(key));

  return fits ? grid : null;
}

/** A cell's figure, or null while it is empty or not a number. */
function figure(text: string | undefined): number | null {
  const n = Number.parseInt(text ?? "", 10);

  return Number.isFinite(n) ? n : null;
}

/**
 * What every line of the sheet adds up to, as the sheet's own text: the sum of
 * its zones' cells once all of them are filled, empty until then — so a card
 * forgotten keeps its line, and the sheet, incomplete.
 */
export function gridLines(
  grid: ScoreGrid,
  cells: readonly string[],
): Record<string, string> {
  const lines: Record<string, number | null> = {};

  for (const [zone, { category }] of grid.zones.entries()) {
    const start = zoneOffset(grid, zone);
    const figures = Array.from({ length: zoneSize(grid, zone) }, (_v, i) =>
      figure(cells[start + i]),
    );
    const counted = figures.filter(f => f !== null);
    const sum =
      counted.length === figures.length
        ? counted.reduce((total, f) => total + f, 0)
        : null;
    const before = lines[category];

    // Two zones on one line (the centre, split on screen) add up together.
    lines[category] =
      before === null || sum === null ? null : (before ?? 0) + sum;
  }

  return Object.fromEntries(
    Object.entries(lines).map(([key, sum]) => [
      key,
      sum === null ? "" : String(sum),
    ]),
  );
}

/** The figures typed so far, added up — the player's running total. */
export function gridTotal(cells: readonly string[]): number {
  return cells.reduce((sum, text) => sum + (figure(text) ?? 0), 0);
}

/**
 * A player's cells opened on lines already recorded (a party corrected, a
 * score reopened): each line's figure in the first cell of its first zone, 0
 * in the others, so it adds up to what was recorded. A line not recorded
 * leaves its cells empty.
 */
export function seedCells(
  grid: ScoreGrid,
  lines: Readonly<Record<string, string>>,
): string[] {
  const seeded = new Set<string>();

  return grid.zones.flatMap(({ category }, zone) => {
    const recorded = figure(lines[category]);
    const first = !seeded.has(category);

    seeded.add(category);

    return Array.from({ length: zoneSize(grid, zone) }, (_v, i) => {
      if (recorded === null) {
        return "";
      }

      return first && i === 0 ? String(recorded) : "0";
    });
  });
}
