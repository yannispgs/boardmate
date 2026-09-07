import { expect, test } from "@playwright/test";

import { backToGames, leaveScoreSheet } from "./utils/end-of-game";
import { adminClient, dropSeeded, seedPlayers } from "./utils/supabase";

/**
 * Category scoring end to end (full-suite only — untagged): play the seeded
 * Cascadia, enter each player's per-category points at the end, compute the
 * total, reveal the ranking last→first, and land on the filled scoresheet.
 */
test("scores a category game and reveals the final ranking", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const gameName = `E2E Cat ${Date.now().toString(36)}`;
  let boardgameId: string | null = null;
  let gameId: string | null = null;

  try {
    // A Cascadia clone with no round limit, so its scoresheet is reachable at
    // once (Cascadia itself now ends only after its 20 rounds).
    const { data: cascadia } = await admin
      .from("boardgames")
      .select("scoring")
      .eq("name", "Cascadia")
      .single();
    boardgameId =
      (
        await admin
          .from("boardgames")
          .insert({
            name: gameName,
            min_players: 1,
            max_players: 4,
            scoring: cascadia?.scoring,
            round_limit: null,
          })
          .select("id")
          .single()
      ).data?.id ?? null;

    // Funnel: our clone, no config, both players.
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

    // Open the end-of-game scoresheet.
    await page.getByRole("button", { name: "Compter les points" }).click();

    // "Total final" stays disabled until every cell holds a number.
    const submit = page.getByRole("button", { name: "Total final" });
    await expect(submit).toBeDisabled();

    // Unlike the other modals, an outside click must NOT close the scoresheet —
    // a misclick would throw away everything typed so far.
    await page.getByRole("dialog").click({ position: { x: 5, y: 5 } });
    await expect(submit).toBeVisible();

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

    // The sheet no longer dead-ends on the games list: it hands over to the
    // screen every other game ends on, and the evening's figures are one tap
    // from there.
    await leaveScoreSheet(page);

    await expect(
      page.getByRole("button", { name: "Voir les statistiques ↓" }),
    ).toBeVisible();

    await backToGames(page);
  } finally {
    await dropSeeded(admin, {
      games: [gameId],
      boardgames: [boardgameId],
      playerNames: players,
    });
  }
});
