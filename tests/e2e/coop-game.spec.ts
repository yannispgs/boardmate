import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * A cooperative game (seeded): there is no individual winner — the whole table
 * wins or loses together. The play screen offers "Terminer la partie" → a
 * shared outcome (common victory / defeat), and the finished screen and games
 * list show that outcome instead of a winner. Full-suite only (untagged).
 */
test("plays a cooperative game: shared victory, no individual winner", async ({
  page,
}) => {
  const players = await seedPlayers(2);
  const boardgameName = `E2E Coop-${Date.now().toString(36)}`;
  let gameId = "";
  let boardgameId = "";

  try {
    // No round limit → the game can be ended at any turn; no scoring.
    const { data, error } = await adminClient()
      .from("boardgames")
      .insert({
        name: boardgameName,
        kind: "cooperative",
        min_players: 2,
        max_players: 4,
      })
      .select("id")
      .single();
    if (error) {
      throw new Error(`Failed to seed coop boardgame: ${error.message}`);
    }
    boardgameId = data.id as string;

    await page.goto("/games/new");
    await page
      .getByRole("button", { name: boardgameName, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();

    for (const name of players) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Continuer →" }).click();

    await page.getByRole("button", { name: "Lancer la partie" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Lancer", exact: true })
      .click();
    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? "";

    // A coop game ends on a shared outcome, not a winner pick.
    await page
      .getByRole("button", { name: "Terminer la partie", exact: true })
      .click();
    await page
      .getByRole("button", { name: "🎉 Victoire commune", exact: true })
      .click();

    // The finished screen celebrates the group, not one player.
    await expect(page.getByText("Victoire commune 🎉")).toBeVisible();

    // The games list shows the shared victory instead of a winner name
    // (ended games live behind a "Terminées" disclosure).
    await page.goto("/games");
    await page.getByText(/Terminées ·/).click();
    await expect(page.getByText("🎉 Victoire").first()).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
    if (boardgameId) {
      await admin.from("boardgames").delete().eq("id", boardgameId);
    }
  }
});
