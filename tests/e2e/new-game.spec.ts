import { expect, test } from "@playwright/test";

import {
  adminClient,
  CATAN_MIN_PLAYERS,
  CATAN_NAME,
  deleteConfigs,
  seedCatanConfig,
  seedPlayers,
} from "./utils/supabase";

/**
 * The new-game funnel (exhaustive, full-suite only — untagged): launching with
 * a chosen config, the minimum-player-count guard, and back-navigation. The
 * happy path without a config is the @critical journey in game.spec.
 */

test("launches a game with a chosen config", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  const configName = `E2E Cfg ${Date.now().toString(36)}`;
  await seedCatanConfig(configName);
  let gameId: string | null = null;

  try {
    await page.goto("/games/new");
    await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
    await page.getByRole("button", { name: configName, exact: true }).click();

    for (const name of players) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Lancer la partie" }).click();

    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;
    await expect(page.locator('[data-current="true"]')).toContainText(
      players[0],
    );
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
    await deleteConfigs([configName]);
  }
});

test("enforces the minimum player count", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);

  try {
    await page.goto("/games/new");
    await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();

    // Two of three selected → below Catan's minimum, launch stays disabled.
    await page.getByRole("button", { name: players[0], exact: true }).click();
    await page.getByRole("button", { name: players[1], exact: true }).click();

    const launch = page.getByRole("button", { name: "Lancer la partie" });
    await expect(launch).toBeDisabled();

    // The third meets the minimum → launch enabled.
    await page.getByRole("button", { name: players[2], exact: true }).click();
    await expect(launch).toBeEnabled();
  } finally {
    await adminClient().from("players").delete().in("name", players);
  }
});

test("steps back through the funnel", async ({ page }) => {
  await page.goto("/games/new");
  await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();

  await expect(page.getByText("2 · Choisis une configuration")).toBeVisible();
  await page.getByRole("button", { name: "← Retour" }).click();
  await expect(page.getByText("1 · Choisis un jeu")).toBeVisible();
});
