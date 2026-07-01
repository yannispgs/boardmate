import { expect, type Page, test } from "@playwright/test";

import {
  adminClient,
  CATAN_MIN_PLAYERS,
  CATAN_NAME,
  seedPlayers,
} from "./utils/supabase";

/**
 * The play screen controls (exhaustive, full-suite only — untagged): pause /
 * resume, the mid-game turn-duration edit, and a full round cycling the turn
 * order back to its opener. Advancing one turn + ending is the @critical path.
 */

/** Walks the funnel (Catan, no config) to a fresh play screen; returns gameId. */
async function startGame(page: Page, players: string[]): Promise<string> {
  await page.goto("/games/new");
  await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
  await page
    .getByRole("button", { name: "Sans configuration", exact: true })
    .click();

  for (const name of players) {
    await page.getByRole("button", { name, exact: true }).click();
  }
  await page.getByRole("button", { name: "Lancer la partie" }).click();

  await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);

  return page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? "";
}

test("pauses and resumes the turn timer", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await startGame(page, players);

    await page.getByRole("button", { name: "Mettre en pause" }).click();
    await expect(page.getByText("EN PAUSE")).toBeVisible();

    await page.getByRole("button", { name: "Reprendre" }).click();
    await expect(
      page.getByRole("button", { name: "Mettre en pause" }),
    ).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("edits the turn duration mid-game", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await startGame(page, players);

    await page
      .getByRole("button", { name: /Durée du tour : \d+s — modifier/ })
      .click();
    await page.getByLabel("Durée du tour en secondes").fill("30");
    await page.getByRole("button", { name: "OK", exact: true }).click();

    await expect(
      page.getByRole("button", { name: "Durée du tour : 30s — modifier" }),
    ).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("a full round cycles back to the first player", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await startGame(page, players);

    const current = page.locator('[data-current="true"]');
    await expect(current).toContainText(players[0]);

    // One turn per seat brings the round back to its opener.
    for (let i = 0; i < players.length; i++) {
      await page.getByRole("button", { name: "Tour suivant →" }).click();
    }

    await expect(current).toContainText(players[0]);
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
