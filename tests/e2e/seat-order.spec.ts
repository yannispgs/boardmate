import { expect, type Page, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * Correcting the seating of a game already under way, after the table was
 * entered in the wrong order at launch — the whole point being not to start the
 * night over and lose its turns.
 *
 * Offered only while nothing recorded names a seat: a simultaneous game (Splito)
 * keeps it throughout, a game turning seat by seat loses it the moment it has
 * gone round. Full-suite only (untagged).
 */

/** The seating as the panel lists it, top seat first. */
function seatNames(page: Page) {
  return page
    .getByRole("list", { name: "Ordre des joueurs" })
    .getByRole("listitem");
}

/** The seat order recorded for a game, player name by player name. */
async function recordedSeats(gameId: string): Promise<string[]> {
  const { data } = await adminClient()
    .from("game_players")
    .select("seat_order, players(name)")
    .eq("game_id", gameId)
    .order("seat_order");

  return (data ?? []).map(
    row => (row.players as unknown as { name: string }).name,
  );
}

test("corrects the seating of a simultaneous game already under way", async ({
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

    // A round is played first: everyone plays at once, so the log never names a
    // seat and the seating stays correctable however far the game has gone.
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await expect(page.getByText("Tour 2 / 13")).toBeVisible();

    await page.getByText("Corriger l'ordre des joueurs").click();
    await expect(seatNames(page)).toHaveText([
      new RegExp(players[0]),
      new RegExp(players[1]),
      new RegExp(players[2]),
    ]);

    // Nothing to save until something has actually moved.
    const save = page.getByRole("button", { name: "Enregistrer l'ordre" });
    await expect(save).toBeDisabled();

    await seatNames(page)
      .nth(1)
      .getByRole("button", { name: "Monter" })
      .click();
    await expect(seatNames(page)).toHaveText([
      new RegExp(players[1]),
      new RegExp(players[0]),
      new RegExp(players[2]),
    ]);

    await save.click();
    await expect(save).toBeDisabled();

    await expect
      .poll(() => recordedSeats(gameId))
      .toEqual([players[1], players[0], players[2]]);
  } finally {
    const admin = adminClient();

    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }

    await admin.from("players").delete().in("name", players);
  }
});

test("stops offering the seating once a game has gone round seat by seat", async ({
  page,
}) => {
  const players = await seedPlayers(3);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    // Nothing played yet: the order entered at launch is still only a plan.
    await expect(page.getByText("Corriger l'ordre des joueurs")).toBeVisible();

    await page.getByRole("button", { name: "Tour suivant →" }).click();

    // One turn is recorded under the player who took it, so that order is now
    // history: the panel goes away rather than let it be contradicted.
    await expect(page.getByText("Corriger l'ordre des joueurs")).toHaveCount(0);
  } finally {
    const admin = adminClient();

    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }

    await admin.from("players").delete().in("name", players);
  }
});
