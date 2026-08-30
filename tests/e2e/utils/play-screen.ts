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
