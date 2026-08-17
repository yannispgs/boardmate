import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * A trick-taking game played one deal at a time (Papayoo, full-suite only —
 * untagged). Nothing is timed, so the play screen has neither countdown nor
 * turn to advance: it opens straight on the button that writes the score. The
 * twenty payoos plus the papayoo card put exactly 250 points on the table, so
 * the form refuses a sheet adding up to anything else — and the stats read the
 * two things that matter here: the heaviest totals, filed under the number of
 * players, and who gets away with nothing.
 */
test("scores a Papayoo party to 250 with no clock and no turns", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  let gameId: string | null = null;

  try {
    await page.goto("/games/new");
    await page.getByRole("button", { name: "Papayoo", exact: true }).click();
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

    // Nothing to time and nothing to advance: no play block, and no « Tour 1 »
    // sitting there for the whole party.
    await expect(
      page.getByRole("button", { name: "Terminer la partie" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tour suivant →" }),
    ).toHaveCount(0);
    await expect(page.getByText("Tour 1", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Terminer la partie" }).click();
    await page.getByLabel(`Score de ${players[0]}`).fill("100");
    await page.getByLabel(`Score de ${players[1]}`).fill("100");
    await page.getByLabel(`Score de ${players[2]}`).fill("100");

    // The complaint doubles as the running count: 300 payoos were never dealt.
    await expect(
      page.getByText("Le total doit faire 250 points (actuellement 300)."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Terminer", exact: true }),
    ).toBeDisabled();

    // Balanced: one player took nothing, which no rule of this game forbids.
    await page.getByLabel(`Score de ${players[2]}`).fill("0");
    await page.getByLabel(`Score de ${players[1]}`).fill("150");

    await expect(
      page.getByText("Le total doit faire 250 points", { exact: false }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Terminer", exact: true }).click();

    await expect(page.getByText("Classement final")).toBeVisible();
    await page.getByRole("button", { name: "Afficher" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Voir les scores" }).click();

    // The smallest pile of payoos takes it.
    const { data: recorded } = await admin
      .from("game_players")
      .select("score, is_winner")
      .eq("game_id", gameId as string)
      .order("seat_order");

    expect((recorded ?? []).map(r => [r.score, r.is_winner])).toEqual([
      [100, false],
      [150, false],
      [0, true],
    ]);

    // The party counted neither turn nor manche: rather than a wall of zeros,
    // the finished screen shows no statistics panel and no link down to one.
    await page.goto(`/games/${gameId}/play`);

    await expect(page.getByText("Partie terminée")).toBeVisible();
    await expect(page.getByText("Statistiques de la partie")).toHaveCount(0);
    await expect(page.getByText("Voir les statistiques ↓")).toHaveCount(0);

    // « Jeux » tab: the two figures a shared pile of points is worth reading.
    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: "Papayoo", exact: true }).click();

    await expect(page.getByText("Pires scores")).toBeVisible();
    await expect(page.getByText("À 3 joueurs")).toBeVisible();
    await expect(page.getByText("Qui finit le plus souvent à 0")).toBeVisible();
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: players[2] })
        .filter({ hasText: "partie à 0 sur" }),
    ).toContainText("1 partie à 0 sur 1 jouée");

    // The same hall of shame follows the player onto his own sheet.
    await page.getByRole("button", { name: "Joueurs", exact: true }).click();
    await page.getByRole("button", { name: players[1] }).first().click();

    await expect(page.getByText("Pires scores — Papayoo")).toBeVisible();
    await expect(
      page.getByText("0 partie à 0 sur 1 jouée — 0 %"),
    ).toBeVisible();
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
