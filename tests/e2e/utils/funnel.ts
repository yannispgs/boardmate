import { expect, type Page } from "@playwright/test";

import { CATAN_NAME } from "./supabase";

/**
 * Walks the new-game funnel end to end — jeu → config → joueurs → récap → final
 * confirmation — and lands on the freshly created game's play screen. Pass a
 * `configName` to pick a seeded config, or omit it to play "Sans configuration".
 * Returns the new game's id (parsed from the URL).
 */
export async function funnelToPlay(
  page: Page,
  players: string[],
  configName?: string,
): Promise<string> {
  await page.goto("/games/new");
  await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();

  await page
    .getByRole("button", {
      name: configName ?? "Sans configuration",
      exact: true,
    })
    .click();

  for (const name of players) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await page.getByRole("button", { name: "Continuer →" }).click();

  // Recap step: launch, then confirm in the final safety dialog.
  await page.getByRole("button", { name: "Lancer la partie" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Lancer", exact: true })
    .click();

  await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);

  return page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? "";
}
