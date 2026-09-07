import { expect, type Page } from "@playwright/test";

/**
 * Closes the score sheet the reveal hands a sheet-scored game over to, and
 * checks it lands on the finished party's own screen — the one every game ends
 * on, whatever it is scored with.
 */
export async function leaveScoreSheet(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  await expect(page.getByText("Partie terminée !")).toBeVisible();
}

/** Leaves the finished party's screen for the games list. */
export async function backToGames(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Retour aux parties" }).click();

  await expect(page).toHaveURL(/\/games$/);
}
