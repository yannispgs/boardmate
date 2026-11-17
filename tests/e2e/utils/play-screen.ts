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

/**
 * Moves the clock the table is looking at by the steps given, in the step
 * buttons' own words (« Ajouter 30 s », « Retirer 1 min »), through the ＋ and
 * － beside it — then shuts the steps by tapping outside them, as a table does.
 *
 * Each step lands on the clock at once; the caller checks where it ended up.
 */
export async function nudgeClock(page: Page, steps: string[]): Promise<void> {
  const layer = page.locator(".clock-layer:visible");

  for (const step of steps) {
    const opener = step.startsWith("Ajouter")
      ? "Ajouter du temps"
      : "Retirer du temps";
    const group = layer.getByRole("group", { name: opener });

    if (!(await group.isVisible())) {
      await layer.getByRole("button", { name: opener }).click();
    }

    await group.getByRole("button", { name: step }).click();
  }

  await page.getByRole("button", { name: "Fermer la correction" }).click();
  await expect(layer.getByRole("group")).toHaveCount(0);
}

/**
 * Sets the timer for the party being played, through ⏱️ beside the countdown:
 * each field by its label, then « Valider ».
 */
export async function setTimer(
  page: Page,
  fields: Readonly<Record<string, string>>,
): Promise<void> {
  await page.getByRole("button", { name: "Réglages du minuteur" }).click();

  const sheet = page.getByRole("dialog", { name: "Réglages du minuteur" });

  for (const [label, value] of Object.entries(fields)) {
    await sheet.getByLabel(label).fill(value);
  }

  await sheet.getByRole("button", { name: "Valider" }).click();
  await expect(sheet).toBeHidden();
}

/** What the clock the table is looking at reads, in seconds. */
export async function clockSeconds(page: Page): Promise<number> {
  const text =
    (await page
      .locator(".clock-layer:visible")
      .getByText(/^\d+(:\d\d)?$/)
      .first()
      .textContent()) ?? "";

  // Under a minute the disc reads bare seconds (« 45 secondes »).
  return text
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}
