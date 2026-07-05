import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * Category scoring end to end (full-suite only — untagged): play the seeded
 * Cascadia, enter each player's per-category points at the end, compute the
 * total, reveal the ranking last→first, and land on the filled scoresheet.
 */
test("scores a category game and reveals the final ranking", async ({
  page,
}) => {
  const players = await seedPlayers(2);
  let gameId: string | null = null;

  try {
    // Funnel: Cascadia, no config, both players.
    await page.goto("/games/new");
    await page.getByRole("button", { name: "Cascadia", exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();
    for (const name of players) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Lancer la partie" }).click();

    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;

    // Open the end-of-game scoresheet.
    await page.getByRole("button", { name: "Compter les points" }).click();

    // "Total final" stays disabled until every cell holds a number.
    const submit = page.getByRole("button", { name: "Total final" });
    await expect(submit).toBeDisabled();

    // Fill every category for both players (0 by default), then the meaningful
    // ones. Ours is a plain animal; Forêt is a ranked biome (1st: +3, 2nd: +1).
    const cats = [
      "Ours",
      "Buse",
      "Renard",
      "Wapiti",
      "Saumon",
      "Forêt",
      "Montagne",
      "Prairie",
      "Marais",
      "Rivière",
      "Pommes de pin",
    ];
    for (const name of players) {
      for (const cat of cats) {
        await page.getByLabel(`${cat} — ${name}`).fill("0");
      }
    }
    await page.getByLabel(`Ours — ${players[0]}`).fill("10");
    await page.getByLabel(`Forêt — ${players[0]}`).fill("15");
    await page.getByLabel(`Ours — ${players[1]}`).fill("3");
    await page.getByLabel(`Forêt — ${players[1]}`).fill("5");

    await expect(submit).toBeEnabled();
    await submit.click();

    // Reveal opens empty: "Afficher" shows last place, "Suivant" the winner.
    await expect(page.getByText("Classement final")).toBeVisible();
    await page.getByRole("button", { name: "Afficher" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Voir les scores" }).click();

    // The scoresheet folds the biome placement bonus into each total:
    // player 0 = 10 + 15 + 3 (wins forêt) = 28.
    await expect(page.getByText("Feuille de scores")).toBeVisible();
    await expect(page.getByText("Bonus classement")).toBeVisible();
    await expect(page.getByText("28", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Retour aux parties" }).click();
    await expect(page).toHaveURL(/\/games$/);
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
