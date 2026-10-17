import { expect, test } from "@playwright/test";

import { funnelToPlay, funnelToRecap } from "./utils/funnel";
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
    await funnelToRecap(page, players);

    // The recap surfaces the score-to-reach; lower it to 5 for this game only.
    const target = page.getByLabel(/Score à atteindre/);
    await expect(target).toBeVisible();
    await target.fill("5");

    await page.getByRole("button", { name: "Choisis le plateau →" }).click();
    await page.getByRole("button", { name: "Valider ce plateau" }).click();
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

/**
 * An option that lengthens the game raises the score to reach: Catan's
 * « Maître du port » is +1, so a 10-point game becomes an 11-point one — shown
 * at the recap and enforced by the live auto-end.
 */
test("raises the win target when the harbour-master bonus is on", async ({
  page,
}) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId: string | null = null;

  try {
    await funnelToRecap(page, players);

    await page.getByLabel(/Score à atteindre/).fill("5");
    await page.getByRole("checkbox", { name: /Maître du port/ }).check();

    // The recap spells the bonus out: 5 + 1 = 6 points to reach.
    await expect(
      page.getByText(/Maître du port.*→.*6.*points à/),
    ).toBeVisible();

    await page.getByRole("button", { name: "Choisis le plateau →" }).click();
    await page.getByRole("button", { name: "Valider ce plateau" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Lancer", exact: true })
      .click();

    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;

    // 5 points is no longer enough — the end prompt only fires at 6.
    await page.getByRole("button", { name: "Ouvrir les scores" }).click();

    const scoreP0 = page.getByLabel(`Score de ${players[0]}`);
    const endPrompt = page.getByRole("dialog", { name: "Fin de partie" });

    await scoreP0.fill("5");
    await scoreP0.press("Enter");
    await expect(endPrompt).toHaveCount(0);

    await scoreP0.fill("6");
    await scoreP0.press("Enter");
    await expect(endPrompt).toBeVisible();

    await endPrompt.getByRole("button", { name: "Terminer" }).click();

    await expect(page.getByText("avec 6 points")).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

/**
 * The recap is prefilled from the game's defaults, and the extensions that may
 * change those defaults arrive on their own request. Every answer from them
 * used to seed the form again — including a plain realtime reload of the same
 * list — so a target typed before they landed was silently put back to the
 * default under the table's fingers.
 *
 * Held open deterministically: the extensions are kept on the wire until the
 * target has been typed, then let through.
 */
test("keeps a target typed before the extensions arrive", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => {
    release = resolve;
  });

  try {
    await page.route("**/rest/v1/extensions?*", async route => {
      await held;
      await route.continue();
    });

    await funnelToRecap(page, players);

    const target = page.getByLabel(/Score à atteindre/);

    await target.fill("5");
    await expect(page.getByRole("heading", { name: "Extensions" })).toHaveCount(
      0,
    );

    release();

    await expect(
      page.getByRole("heading", { name: "Extensions" }),
    ).toBeVisible();
    await expect(target).toHaveValue("5");
  } finally {
    await adminClient().from("players").delete().in("name", players);
  }
});
