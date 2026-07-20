import { expect, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
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
 * a chosen config, the minimum-player-count guard, back-navigation, and tweaking
 * the win target at the recap step. The happy path without a config is the
 * @critical journey in game.spec.
 */

test("launches a game with a chosen config", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  const configName = `E2E Cfg ${Date.now().toString(36)}`;
  await seedCatanConfig(configName);
  let gameId: string | null = null;

  try {
    gameId = await funnelToPlay(page, players, configName);
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

    // Two of three selected → below Catan's minimum, "Continuer" stays disabled.
    await page.getByRole("button", { name: players[0], exact: true }).click();
    await page.getByRole("button", { name: players[1], exact: true }).click();

    const next = page.getByRole("button", { name: "Continuer →" });
    await expect(next).toBeDisabled();

    // The third meets the minimum → "Continuer" enabled.
    await page.getByRole("button", { name: players[2], exact: true }).click();
    await expect(next).toBeEnabled();
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

test("tweaks the win target at the recap and it takes effect", async ({
  page,
}) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId: string | null = null;

  try {
    await page.goto("/games/new");
    await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();

    for (const name of players) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Continuer →" }).click();

    // The recap surfaces the score-to-reach; lower it to 5 for this game only.
    const target = page.getByLabel(/Score à atteindre/);
    await expect(target).toBeVisible();
    await target.fill("5");

    await page.getByRole("button", { name: "Lancer la partie" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Lancer", exact: true })
      .click();

    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;

    // Reaching the tweaked target (5, not Catan's default 10) ends the game.
    // Type the total directly so the test doesn't depend on the starting score.
    await page.getByRole("button", { name: "Ouvrir les scores" }).click();

    const scoreP0 = page.getByLabel(`Score de ${players[0]}`);
    await scoreP0.fill("5");
    await scoreP0.press("Enter");

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Terminer" })
      .click();

    await expect(page.getByText("avec 5 points")).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
