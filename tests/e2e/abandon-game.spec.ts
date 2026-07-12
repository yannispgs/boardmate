import { expect, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * Abandoning an ongoing game from the games list: it permanently deletes the
 * game (no score kept). Finished games get no such control. Full-suite only.
 */
test("abandons an ongoing game from the list", async ({ page }) => {
  const players = await seedPlayers(3);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    await page.goto("/games");
    // The ongoing game is listed with its current player.
    const card = page
      .locator("li")
      .filter({ hasText: `Au tour de ${players[0]}` });
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: /Abandonner la partie/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Abandonner" }).click();

    // The game is gone from the list.
    await expect(page.getByText(`Au tour de ${players[0]}`)).toHaveCount(0);
    gameId = "";
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
