import { expect, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
import { adminClient, CATAN_MIN_PLAYERS, seedPlayers } from "./utils/supabase";

/**
 * One full game, end to end: walk the new-game funnel (jeu → config → joueurs →
 * récap → confirmation), land on the play screen, advance a turn, then end the
 * game and pick a winner. Players are seeded via the service role; the seeded
 * Catan boardgame is used.
 */
test("plays a full game from the funnel to the winner", {
  tag: "@critical",
}, async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId: string | null = null;

  try {
    gameId = await funnelToPlay(page, players);

    // The current player is the highlighted tag in the turn-order ribbon.
    const currentTag = page.locator('[data-current="true"]');

    // The first seated player is up.
    await expect(currentTag).toContainText(players[0]);

    // Advance one turn → the second player is now up.
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(currentTag).toContainText(players[1]);

    // Catan is scored live and starts everyone at 2: open the score sheet and
    // type player 0 straight to the target (default pointsToWin = 10) so the
    // test doesn't depend on the starting score. Reaching it closes the sheet
    // and prompts to end.
    await page.getByRole("button", { name: "Ouvrir les scores" }).click();

    const scoreP0 = page.getByLabel(`Score de ${players[0]}`);
    await scoreP0.fill("10");
    await scoreP0.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Terminer" }).click();

    await expect(
      page.getByRole("heading", { name: "Partie terminée !" }),
    ).toBeVisible();
    await expect(page.getByText(`Bravo ${players[0]}`)).toBeVisible();
    await expect(page.getByText("avec 10 points")).toBeVisible();
    // The score history (10 increments) drives the evolution chart in the stats.
    await expect(page.getByText("Évolution du score")).toBeVisible();

    // The finished-games list shows the winner and, for a scored game, their
    // score.
    await page.goto("/games");
    const finished = page.locator("details", {
      has: page.getByText("Terminées"),
    });
    await finished.locator("summary").click();
    await expect(
      finished.getByText(new RegExp(`${players[0]}.*10 pts`)),
    ).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
