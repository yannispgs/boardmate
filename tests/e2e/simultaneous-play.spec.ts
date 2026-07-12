import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * A simultaneous-play game (Splito, seeded): everyone plays each round at once,
 * so the play screen shows "everyone plays" + a wait picker instead of a
 * current player, and one "Tour suivant" advances the whole round. Full-suite
 * only (untagged).
 */
test("plays a simultaneous game: shared round + wait picker", async ({
  page,
}) => {
  const players = await seedPlayers(3);
  let gameId = "";

  try {
    await page.goto("/games/new");
    await page.getByRole("button", { name: "Splito", exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();

    // No turn order → the step title omits "(dans l'ordre de jeu)".
    await expect(
      page.getByRole("heading", {
        name: "3 · Choisis les joueurs",
        exact: true,
      }),
    ).toBeVisible();
    for (const name of players) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    // Selection is a checkmark, not an order number.
    await expect(page.getByText("✓").first()).toBeVisible();
    await page.getByRole("button", { name: "Continuer →" }).click();

    // Recap: no "premier joueur" / wheel for a game without order.
    await expect(page.getByText("Premier joueur")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Tirer au sort/ }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Lancer la partie" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Lancer", exact: true })
      .click();
    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? "";

    // Everyone plays at once — no "current player", and Splito is 13 fixed rounds.
    await expect(page.getByText("Tout le monde joue")).toBeVisible();
    await expect(page.getByText("Tour 1 / 13")).toBeVisible();

    // Tap the player the table waited on, then advance the whole round.
    await page.getByRole("button", { name: players[0], exact: true }).click();
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(page.getByText("Tour 2 / 13")).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
