import { expect, type Page, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/** The seeded Splendor boardgame — the first game whose target waits. */
const SPLENDOR_NAME = "Splendor";
/** Splendor's template default, so the funnel needs no config picked. */
const POINTS_TO_WIN = 15;

/** Walks the new-game funnel and lands on the play screen, returning its id. */
async function startSplendor(page: Page, players: string[]) {
  await page.goto("/games/new");
  await page.getByRole("button", { name: SPLENDOR_NAME, exact: true }).click();
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

  return page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;
}

/** Types a player's running total on the score sheet, and closes it. */
async function score(page: Page, name: string, total: number) {
  await page.getByRole("button", { name: "Ouvrir les scores" }).click();
  const field = page.getByLabel(`Score de ${name}`);

  await field.fill(String(total));
  await field.press("Enter");
  await page.getByRole("button", { name: "Fermer" }).click();
}

/**
 * Round-end stop condition (full-suite only — untagged): reaching the target at
 * Splendor doesn't end the game on the spot, the lap is played out first so
 * everybody has had the same number of turns — including the player who reached
 * it, who is owed the rest of his own turn. The table is told as it happens: a
 * banner, and the turn order stopping at a finish flag.
 */
test("plays the lap out before ending, whoever reaches the target", async ({
  page,
}) => {
  const players = await seedPlayers(3);
  const admin = adminClient();
  let gameId: string | null = null;

  try {
    gameId = await startSplendor(page, players);

    const banner = page.getByText("Dernier tour de table");
    const finish = page.getByRole("img", { name: "Fin de la partie" });
    const dialog = page.getByRole("dialog", { name: "Fin de partie" });

    await expect(banner).toHaveCount(0);
    await expect(finish).toHaveCount(0);

    // The first seat reaches the target. Two players are still to answer, so
    // the game keeps running — it only says out loud that it is ending, and
    // the turn order now stops at the end of this lap.
    await score(page, players[0], POINTS_TO_WIN);

    await expect(banner).toBeVisible();
    await expect(finish).toBeVisible();
    await expect(dialog).toHaveCount(0);

    // The two remaining seats take their turn. The last of them overtakes the
    // leader, which still doesn't end anything: his turn isn't over.
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(dialog).toHaveCount(0);

    await score(page, players[2], POINTS_TO_WIN + 1);
    await expect(dialog).toHaveCount(0);

    // He ends his turn: everybody has now played the same number of turns.
    await page.getByRole("button", { name: "Tour suivant →" }).click();

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        "L'objectif est atteint et le tour de table est terminé",
      ),
    ).toBeVisible();

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

/**
 * Waving the ending off calls it off entirely: the table said it keeps playing,
 * so it is neither asked again on every turn nor left with a banner and a finish
 * flag announcing an end that is no longer coming.
 */
test("keeps playing, and stops announcing the end, once waved off", async ({
  page,
}) => {
  const players = await seedPlayers(3);
  const admin = adminClient();
  let gameId: string | null = null;

  try {
    gameId = await startSplendor(page, players);

    const banner = page.getByText("Dernier tour de table");
    const finish = page.getByRole("img", { name: "Fin de la partie" });
    const dialog = page.getByRole("dialog", { name: "Fin de partie" });

    await score(page, players[0], POINTS_TO_WIN);
    await expect(banner).toBeVisible();

    // The lap is played out and the game offers to stop there.
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Continuer la partie" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(banner).toHaveCount(0);
    await expect(finish).toHaveCount(0);

    // And the table is left alone: the question isn't put again every turn, and
    // the turn order keeps rolling past the lap it was going to stop at — a
    // finish line left behind the current player would empty the ribbon.
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("img", { name: `${players[2]} — joueur courant` }),
    ).toBeVisible();
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }

    await admin.from("players").delete().in("name", players);
  }
});
