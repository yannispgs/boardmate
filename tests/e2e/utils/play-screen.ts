import type { Locator, Page } from "@playwright/test";

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
