import { expect, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
import {
  adminClient,
  CATAN_ID,
  CATAN_MIN_PLAYERS,
  seedPlayers,
} from "./utils/supabase";

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

test("the turn timer grows each round per the schedule", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    // Catan's schedule: 45 s base, +5 s each round.
    await expect(
      page.getByRole("button", { name: "Durée du tour : 45s — modifier" }),
    ).toBeVisible();

    // A full round of turns brings the game to round 2 → 50 s.
    for (let i = 0; i < players.length; i++) {
      await page.getByRole("button", { name: "Tour suivant →" }).click();
    }

    await expect(
      page.getByRole("button", { name: "Durée du tour : 50s — modifier" }),
    ).toBeVisible();
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

test("live-banners a time monopoly and hides it when time is balanced", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(CATAN_MIN_PLAYERS);
  const gameIds: string[] = [];

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = names.map(
      n => (seeded ?? []).find(p => p.name === n)?.id as string,
    );

    // An ongoing Catan game: one turn per entry in `durations` (played in
    // `turnRound`), the game sitting in `gameRound`. Fewer durations than
    // players = a round still in progress.
    async function seedOngoing(
      durations: number[],
      {
        gameRound = 2,
        turnRound = 1,
      }: { gameRound?: number; turnRound?: number } = {},
    ) {
      const { data: game } = await admin
        .from("games")
        .insert({
          boardgame_id: CATAN_ID,
          status: "ongoing",
          round: gameRound,
          turn: durations.length + 1,
          current_player_id: ids[0],
        })
        .select("id")
        .single();
      const gameId = game?.id as string;
      gameIds.push(gameId);

      await admin.from("game_players").insert(
        ids.map((player_id, i) => ({
          game_id: gameId,
          player_id,
          seat_order: i,
        })),
      );
      await admin.from("game_turns").insert(
        durations.map((duration_s, i) => ({
          game_id: gameId,
          player_id: ids[i],
          round: turnRound,
          turn_no: i + 1,
          duration_s,
        })),
      );

      return gameId;
    }

    // Player 1 took almost all the time → the banner names them.
    const hogGame = await seedOngoing([100, 5, 5]);
    await page.goto(`/games/${hogGame}/play`);

    const banner = page.getByText(/monopolise le temps/);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(names[0]);

    // A balanced game → nobody is over their fair share → no banner.
    const evenGame = await seedOngoing([20, 20, 20]);
    await page.goto(`/games/${evenGame}/play`);

    await expect(page.getByText(/monopolise le temps/)).toHaveCount(0);

    // Mid-round: only player 1 has played this (in-progress) round 1, holding
    // all the recorded time — but no round is complete yet, so no banner. The
    // hog only refreshes once everyone has played the round.
    const midRound = await seedOngoing([100], { gameRound: 1, turnRound: 1 });
    await page.goto(`/games/${midRound}/play`);

    await expect(page.getByText(/monopolise le temps/)).toHaveCount(0);
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }
    await admin.from("players").delete().in("name", names);
  }
});
