import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The « EN PAUSE » badge of the clock the table is actually looking at.
 *
 * The play screen mounts both clocks at once — the per-player countdown and the
 * table stopwatch — so the row keeps its height while a phase hands over to the
 * next; the one not in use is hidden, not unmounted. Both run off the same
 * timer, so both carry the badge, and asking for the words alone finds two.
 * Scoping to the visible layer asks for the only one a player can read.
 */
export function pausedBadge(page: Page): Locator {
  return page.locator(".clock-layer:visible").getByText("EN PAUSE");
}

/**
 * Takes the stage the game has just moved on to, the way a table does: by
 * tapping the announcement that covers the screen.
 *
 * It is a step and not a banner — the new stage's clock does not start until
 * somebody acknowledges it, so nothing is charged to the first player for a
 * card he had not read. Which means it eats the next tap: any journey that
 * crosses a manche or a generation has to take it before it can reach a button
 * again. `transitions.spec.ts` is where the behaviour itself is tested; here it
 * is only got out of the way.
 */
export async function takeStage(page: Page): Promise<void> {
  await page.getByRole("status").click();
}

/** One trip through a time-correction sheet, from opening it to applying it. */
export interface TimeCorrection {
  /** The button that opens the sheet, whose wording the sheet reuses as title. */
  sheet: string;
  /** The text box inside it. */
  field: string;
  /** What the table types in. */
  typed: string;
  /** The ± button it then taps, in the sheet's own words. */
  step: string;
  /** What the box has to read once that button has moved the typed time. */
  expected: string;
}

/**
 * Corrects one of the play screen's two clocks — the per-player countdown or
 * the table stopwatch — through the sheet that edits it.
 *
 * There is one sheet, opened on either clock, so both journeys walk the same
 * five steps and differ only in wording and figures: type a time, watch the
 * sheet echo it, nudge it by a step, watch the box follow, apply. What each
 * caller then checks is its own — the corrected countdown lands on a ring, the
 * corrected stopwatch on a disc and, later, in `game_phases`.
 */
export async function correctTime(
  page: Page,
  { sheet, field, typed, step, expected }: TimeCorrection,
): Promise<void> {
  await page.getByRole("button", { name: sheet }).click();

  const box = page.getByRole("textbox", { name: field });

  await box.fill(typed);

  await expect(page.getByRole("dialog", { name: sheet })).toContainText(typed);

  await page.getByRole("button", { name: step }).click();

  await expect(box).toHaveValue(expected);

  await page.getByRole("button", { name: "Appliquer" }).click();
}
