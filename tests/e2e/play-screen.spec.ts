import { expect, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
import { adminClient, CATAN_MIN_PLAYERS, seedPlayers } from "./utils/supabase";

/**
 * The play screen controls (exhaustive, full-suite only — untagged): pause /
 * resume, the mid-game turn-duration edit, and a full round cycling the turn
 * order back to its opener. Advancing one turn + ending is the @critical path.
 */

test("pauses and resumes the turn timer", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    await page.getByRole("button", { name: "Mettre en pause" }).click();
    await expect(page.getByText("EN PAUSE")).toBeVisible();

    await page.getByRole("button", { name: "Reprendre" }).click();
    await expect(
      page.getByRole("button", { name: "Mettre en pause" }),
    ).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("edits the turn duration mid-game", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    await page
      .getByRole("button", { name: /Durée du tour : \d+s — modifier/ })
      .click();
    await page.getByLabel("Durée du tour en secondes").fill("30");
    await page.getByRole("button", { name: "OK", exact: true }).click();

    await expect(
      page.getByRole("button", { name: "Durée du tour : 30s — modifier" }),
    ).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("counts overtime once the turn timer runs out", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    // Shorten the turn to 1s (editing pauses the timer), then resume it.
    await page
      .getByRole("button", { name: /Durée du tour : \d+s — modifier/ })
      .click();
    await page.getByLabel("Durée du tour en secondes").fill("1");
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await page.getByRole("button", { name: "Reprendre" }).click();

    // Past zero, the readout flips to an overtime count-up.
    await expect(page.getByText("dépassement")).toBeVisible({ timeout: 15000 });
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("shows live time stats once a turn has been played", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    const openStats = page.getByRole("button", {
      name: "Ouvrir les statistiques",
    });

    // Before any turn: an empty state.
    await openStats.click();
    await expect(page.getByText(/premier tour joué/)).toBeVisible();
    await page.getByRole("button", { name: "Fermer", exact: true }).click();

    // Play a turn → the time breakdown appears.
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await openStats.click();
    await expect(page.getByText(/Répartition du temps/)).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("a full round cycles back to the first player", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    const current = page.locator('[data-current="true"]');
    await expect(current).toContainText(players[0]);

    // One turn per seat brings the round back to its opener.
    for (let i = 0; i < players.length; i++) {
      await page.getByRole("button", { name: "Tour suivant →" }).click();
    }

    await expect(current).toContainText(players[0]);
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("live scores float at zero and persist across the score sheet", async ({
  page,
}) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    // The side button opens the score sheet.
    const openScores = page.getByRole("button", { name: "Ouvrir les scores" });
    await openScores.click();

    const minus = page.getByRole("button", {
      name: `Retirer un point à ${players[0]}`,
    });
    const plus = page.getByRole("button", {
      name: `Ajouter un point à ${players[0]}`,
    });

    // Catan is positive-only: at 0 the − is disabled; a + enables it.
    await expect(minus).toBeDisabled();
    await plus.click();
    await plus.click();
    await expect(minus).toBeEnabled();

    // Closing keeps the running total — the side button shows 2 / objective 10.
    await page.getByRole("button", { name: "Fermer", exact: true }).click();
    await expect(openScores).toContainText("2/10");

    // Reopening shows the kept total (− still enabled, not reset to 0).
    await openScores.click();
    await expect(minus).toBeEnabled();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("closes the score sheet when clicking outside it", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    await page.getByRole("button", { name: "Ouvrir les scores" }).click();
    const minus = page.getByRole("button", {
      name: `Retirer un point à ${players[0]}`,
    });
    await expect(minus).toBeVisible();

    // Clicking the backdrop (a corner, outside the card) dismisses the sheet —
    // no need to press "Fermer".
    await page
      .getByRole("dialog", { name: "Scores" })
      .click({ position: { x: 5, y: 5 } });
    await expect(minus).toBeHidden();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("ends when the target is exceeded, defaulting to the top scorer", async ({
  page,
}) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    await page.getByRole("button", { name: "Ouvrir les scores" }).click();

    // A turn can bring several points: enter the total directly (12 > Catan's
    // objective of 10). Committing on blur ends the game.
    const input = page.getByLabel(`Score de ${players[0]}`);
    await input.fill("12");
    await input.blur();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The top scorer (player 0, 12 pts) is pre-selected; confirm.
    await dialog.getByRole("button", { name: "Terminer" }).click();

    await expect(page.getByText(`Bravo ${players[0]}`)).toBeVisible();
    await expect(page.getByText("avec 12 points")).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("banners when a player monopolises the time", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    // Player 1 takes a long turn, the next is instant → player 1 has ~all the
    // time once two players have played, tripping the live banner.
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Tour suivant →" }).click();
    await page.getByRole("button", { name: "Tour suivant →" }).click();

    await expect(page.getByText(/monopolise le temps/)).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
