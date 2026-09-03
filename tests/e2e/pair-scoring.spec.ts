import { expect, test } from "@playwright/test";

import { backToGames, leaveScoreSheet } from "./utils/end-of-game";
import { adminClient, dropSeeded, seedPlayers } from "./utils/supabase";

/**
 * Pair scoring end to end (full-suite only — untagged): play the seeded Splito,
 * count the piles round the table — each shared by two neighbours — and check
 * every player is scored on the PRODUCT of his two, all the way to the filled
 * sheet.
 */
test("scores a pair game on the piles shared between neighbours", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Tas ${Date.now().toString(36)}`;
  let boardgameId: string | null = null;
  let gameId: string | null = null;

  try {
    // A Splito clone with no round limit, so its scoresheet is reachable at
    // once (Splito itself ends only after its 13 rounds).
    const { data: splito } = await admin
      .from("boardgames")
      .select("scoring")
      .eq("name", "Splito")
      .single();
    boardgameId =
      (
        await admin
          .from("boardgames")
          .insert({
            name: gameName,
            min_players: 3,
            max_players: 8,
            turn_mode: "simultaneous",
            scoring: splito?.scoring,
            round_limit: null,
          })
          .select("id")
          .single()
      ).data?.id ?? null;

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

    await page.getByRole("button", { name: "Compter les points" }).click();

    // Nothing is countable until every pile has been visited: one missing pile
    // would silently zero two players.
    const submit = page.getByRole("button", { name: "Total final" });

    await expect(submit).toBeDisabled();
    await expect(page.getByText("Encore 3 tas à compter")).toBeVisible();

    // The ring closes back on the first player, so the last pile is his too.
    const piles = [
      page.getByRole("button", {
        name: `Tas entre ${players[0]} et ${players[1]}`,
      }),
      page.getByRole("button", {
        name: `Tas entre ${players[1]} et ${players[2]}`,
      }),
      page.getByRole("button", {
        name: `Tas entre ${players[2]} et ${players[0]}`,
      }),
    ];
    const plus = page.getByRole("button", { name: "Ajouter un point au tas" });
    const minus = page.getByRole("button", { name: "Retirer un point au tas" });

    // Selecting a pile seeds it at a typical 6, so the arrows start near the
    // answer: leave the first there, take the second to 7 and the third to 5.
    await piles[0].click();
    await expect(piles[0]).toHaveText("6");

    await piles[1].click();
    await plus.click();
    await expect(piles[1]).toHaveText("7");

    await piles[2].click();
    await minus.click();
    await expect(piles[2]).toHaveText("5");

    // Each player multiplies the two piles flanking his seat, and the middle
    // one is counted by both of his neighbours.
    await expect(page.getByLabel(`Score de ${players[0]}`)).toContainText(
      "5 × 6 = 30",
    );
    await expect(page.getByLabel(`Score de ${players[1]}`)).toContainText(
      "6 × 7 = 42",
    );
    await expect(page.getByLabel(`Score de ${players[2]}`)).toContainText(
      "7 × 5 = 35",
    );

    await expect(submit).toBeEnabled();
    await submit.click();

    // Reveal climbs last → first, then the sheet spells out the multiplication.
    await expect(page.getByText("Classement final")).toBeVisible();
    await page.getByRole("button", { name: "Afficher" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Voir les scores" }).click();

    await expect(page.getByText("Feuille de scores")).toBeVisible();
    await expect(page.getByText("6 × 7", { exact: true })).toBeVisible();
    await expect(page.getByText("42", { exact: true })).toBeVisible();

    // A game scored on piles leaves its sheet the same way as any other: onto
    // the finished party's screen, and the games list only after that.
    await leaveScoreSheet(page);
    await backToGames(page);
  } finally {
    await dropSeeded(admin, {
      games: [gameId],
      boardgames: [boardgameId],
      playerNames: players,
    });
  }
});
