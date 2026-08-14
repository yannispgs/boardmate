import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/** The seeded Splendor boardgame — the first game whose target waits. */
const SPLENDOR_NAME = "Splendor";
/** Splendor's template default, so the funnel needs no config picked. */
const POINTS_TO_WIN = 15;

/**
 * Round-end stop condition (full-suite only — untagged): reaching the target at
 * Splendor doesn't end the game on the spot, the lap is played out first so
 * everybody has had the same number of turns. Both halves of that rule are
 * walked here: the target reached mid-lap, which only warns and keeps playing,
 * and the target reached by the last player of the lap, where there is nobody
 * left to answer and the game stops at once.
 */
test("plays the lap out before ending, unless the last seat reaches the target", async ({
  page,
}) => {
  const players = await seedPlayers(3);
  const admin = adminClient();
  let gameId: string | null = null;

  try {
    await page.goto("/games/new");
    await page
      .getByRole("button", { name: SPLENDOR_NAME, exact: true })
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
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;

    const banner = page.getByText("Dernier tour de table");
    const dialog = page.getByRole("dialog", { name: "Fin de partie" });

    await expect(banner).toHaveCount(0);

    // The first seat reaches the target. Two players are still to answer, so
    // the game keeps running — it only says out loud that it is ending, and
    // the score sheet stays open since nothing is taking it over.
    await page.getByRole("button", { name: "Ouvrir les scores" }).click();
    const first = page.getByLabel(`Score de ${players[0]}`);
    await first.fill(String(POINTS_TO_WIN));
    await first.press("Enter");

    await page.getByRole("button", { name: "Fermer" }).click();
    await expect(banner).toBeVisible();
    await expect(dialog).toHaveCount(0);

    // The two remaining seats take their turn, and the lap closes on the third
    // « tour suivant » — everybody has now played the same number of turns.
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Tour suivant →" }).click();

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        "L'objectif est atteint et le tour de table est terminé",
      ),
    ).toBeVisible();

    // Waved off: the table keeps playing and isn't asked again on every turn.
    await dialog.getByRole("button", { name: "Continuer la partie" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(dialog).toHaveCount(0);

    // The last seat of the lap is up: whatever he scores, nobody is left to
    // answer him — so overtaking the leader ends the game on the spot.
    await page.getByRole("button", { name: "Ouvrir les scores" }).click();
    const last = page.getByLabel(`Score de ${players[2]}`);
    await last.fill(String(POINTS_TO_WIN + 1));
    await last.press("Enter");

    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Terminer" }).click();

    await expect(
      page.getByRole("heading", { name: "Partie terminée !" }),
    ).toBeVisible();
    await expect(page.getByText(`Bravo ${players[2]}`)).toBeVisible();
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
