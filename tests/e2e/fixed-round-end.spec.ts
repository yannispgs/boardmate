import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * Fixed-length end condition (full-suite only — untagged): a game with a round
 * limit ends automatically on the last seat of the last round, handing over to
 * its scoring. Uses a seeded 1-round category game so the whole run is quick.
 */
test("ends automatically after the last round, then scores", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const gameName = `E2E Fixed ${Date.now().toString(36)}`;
  let boardgameId: string | null = null;
  let gameId: string | null = null;

  try {
    const { data } = await admin
      .from("boardgames")
      .insert({
        name: gameName,
        min_players: 2,
        max_players: 4,
        round_limit: 1,
        scoring: {
          timing: "final",
          entry: "categories",
          winCondition: { type: "highest" },
          sheet: [{ key: "pts", label: "Points" }],
        },
      })
      .select("id")
      .single();
    boardgameId = data?.id ?? null;

    await page.goto("/games/new");
    await page.getByRole("button", { name: gameName, exact: true }).click();
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
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;

    // The round budget is shown, and the game can't be scored yet.
    await expect(page.getByText("Tour 1 / 1")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Compter les points" }),
    ).toHaveCount(0);

    // Player 1 hands over to the last player.
    await page.getByRole("button", { name: "Tour suivant →" }).click();

    // Player 2 is the final turn: no more advancing, the game is over and the
    // scoring takes over.
    await expect(page.getByText("Dernier tour joué")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tour suivant →" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Compter les points" }).click();
    await page.getByLabel(`Points — ${players[0]}`).fill("5");
    await page.getByLabel(`Points — ${players[1]}`).fill("2");
    await page.getByRole("button", { name: "Total final" }).click();

    await page.getByRole("button", { name: "Afficher" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Voir les scores" }).click();
    await page.getByRole("button", { name: "Retour aux parties" }).click();
    await expect(page).toHaveURL(/\/games$/);
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    if (boardgameId) {
      await admin.from("boardgames").delete().eq("id", boardgameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
