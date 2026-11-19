import { expect, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
import {
  clockSeconds,
  nudgeClock,
  pausedBadge,
  setTimer,
} from "./utils/play-screen";
import {
  adminClient,
  CATAN_ID,
  CATAN_MIN_PLAYERS,
  seedPlayers,
} from "./utils/supabase";

/**
 * The play screen controls (exhaustive, full-suite only — untagged): pause /
 * resume, the mid-game turn-duration edit, the correction of the running turn's
 * remaining time, and a full round cycling the turn order back to its opener.
 * Advancing one turn + ending is the @critical path.
 */

test("pauses and resumes the turn timer", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    await page.getByRole("button", { name: "Mettre en pause" }).click();
    await expect(pausedBadge(page)).toBeVisible();

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

test("sets the timer for this party only, and keeps it on this phone", async ({
  page,
}) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    // Under the disc, the settings the turns are timed on, at a glance.
    const settings = page.getByRole("button", { name: "Réglages du minuteur" });

    await expect(settings).toHaveText(/0:45 · \+5 s\/manche/);

    // It takes its own room: the next-turn button sits clear below it.
    const chip = await settings.boundingBox();
    const next = await page
      .getByRole("button", { name: "Tour suivant →" })
      .boundingBox();

    expect(chip && next).toBeTruthy();
    if (chip && next) {
      expect(next.y - (chip.y + chip.height)).toBeGreaterThanOrEqual(16);
    }

    // Catan's turns grow round by round, so all three settings are offered,
    // with the configuration's values to start from.
    await settings.click();

    const sheet = page.getByRole("dialog", { name: "Réglages du minuteur" });

    await expect(sheet.getByLabel("Durée de la 1ʳᵉ manche")).toHaveValue("45");
    await expect(sheet.getByLabel("Ajout par manche")).toHaveValue("5");
    await expect(sheet.getByLabel("Plafond")).toBeVisible();

    // A cap shorter than the first turn cannot be timed on.
    await sheet.getByLabel("Plafond").fill("10");
    await expect(sheet.getByRole("button", { name: "Valider" })).toBeDisabled();
    await sheet.getByRole("button", { name: "Annuler" }).click();

    // The turn takes its new length at once, on the time already played.
    await setTimer(page, { "Durée de la 1ʳᵉ manche": "300", Plafond: "600" });
    await expect(settings).toHaveText(/5:00 · \+5 s\/manche/);
    await expect.poll(() => clockSeconds(page)).toBeGreaterThan(250);

    // A reload finds them again: they are kept on this phone…
    await page.reload();
    await expect.poll(() => clockSeconds(page)).toBeGreaterThan(250);

    // …and never written to the party, whose configuration stays as launched.
    const { data: party } = await adminClient()
      .from("games")
      .select("config_values")
      .eq("id", gameId)
      .single();

    expect(JSON.stringify(party?.config_values ?? {})).not.toContain("300");

    // Back to the configuration's settings in one tap.
    await page.getByRole("button", { name: "Réglages du minuteur" }).click();
    await sheet
      .getByRole("button", { name: "Revenir aux réglages de la configuration" })
      .click();
    await expect.poll(() => clockSeconds(page)).toBeLessThanOrEqual(45);
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("corrects the time left with the steps beside the clock", async ({
  page,
}) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    // The clock holds while a correction is open, running or not.
    await page.getByRole("button", { name: "Retirer du temps" }).click();

    const held = await clockSeconds(page);

    // The steps unfold beside the disc, never over the figures being set.
    const figures = page
      .locator(".clock-layer:visible")
      .getByText(/^\d+(:\d\d)?$/)
      .first();
    const steps = page.getByRole("group", { name: "Retirer du temps" });
    const [f, g] = [await figures.boundingBox(), await steps.boundingBox()];

    expect(f && g).toBeTruthy();
    if (f && g) {
      const apart =
        g.x + g.width <= f.x ||
        f.x + f.width <= g.x ||
        g.y + g.height <= f.y ||
        f.y + f.height <= g.y;

      expect(apart).toBe(true);
    }

    // Long enough for a running clock to have shown two seconds less.
    const since = Date.now();

    await expect
      .poll(() => Date.now() - since, { timeout: 5000 })
      .toBeGreaterThanOrEqual(2500);
    expect(await clockSeconds(page)).toBe(held);

    // A 45-second turn with under 45 s left: nothing more to add, but a whole
    // minute can still come off — the turn then runs over.
    const minus = page.getByRole("group", { name: "Retirer du temps" });

    await expect(
      minus.getByRole("button", { name: "Retirer 1 min" }),
    ).toBeEnabled();
    await expect(
      minus.getByRole("button", { name: "Retirer 10 s" }),
    ).toBeEnabled();

    // Each step lands at once — no « Appliquer ».
    await minus.getByRole("button", { name: "Retirer 10 s" }).click();
    expect(await clockSeconds(page)).toBe(held - 10);

    // Tapping the other sign swaps the steps over.
    await page.getByRole("button", { name: "Ajouter du temps" }).click();
    await expect(minus).toHaveCount(0);

    const plus = page.getByRole("group", { name: "Ajouter du temps" });

    await expect(
      plus.getByRole("button", { name: "Ajouter 10 s" }),
    ).toBeEnabled();
    await expect(
      plus.getByRole("button", { name: "Ajouter 30 s" }),
    ).toBeDisabled();

    // A tap anywhere else shuts them, and the clock runs again.
    await page.getByRole("button", { name: "Fermer la correction" }).click();
    await expect(plus).toHaveCount(0);
    await expect
      .poll(() => clockSeconds(page), { timeout: 5000 })
      .toBeLessThan(held - 10);

    // Paused beforehand, it stays paused once corrected.
    await page.getByRole("button", { name: "Mettre en pause" }).click();
    await nudgeClock(page, ["Retirer 10 s"]);
    await expect(pausedBadge(page)).toBeVisible();
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

    // Taken down to a few seconds, the turn runs out on its own.
    await nudgeClock(page, ["Retirer 30 s", "Retirer 10 s"]);

    // Past zero, the readout flips to an overtime count-up.
    await expect(page.getByText("dépassement")).toBeVisible({ timeout: 15000 });

    // In overtime, taking time off runs the turn further over.
    await page.getByRole("button", { name: "Retirer du temps" }).click();

    const over = await clockSeconds(page);

    expect(over).toBeLessThan(0);
    await page
      .getByRole("group", { name: "Retirer du temps" })
      .getByRole("button", { name: "Retirer 10 s" })
      .click();
    expect(await clockSeconds(page)).toBe(over - 10);
    await expect(page.getByText("dépassement")).toBeVisible();
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
    expect(await clockSeconds(page)).toBeLessThanOrEqual(45);

    // A full round of turns brings the game to round 2 → 50 s, read as the
    // turn starts.
    for (let i = 0; i < players.length; i++) {
      await page.getByRole("button", { name: "Tour suivant →" }).click();
    }

    await expect.poll(() => clockSeconds(page)).toBeGreaterThan(45);
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("live scores start at 2, floor there, and persist across the score sheet", async ({
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

    // Catan starts everyone at 2 and can't drop below (min 2): the − is disabled
    // at the floor, + raises it, and − returns to 2 then disables again.
    await expect(minus).toBeDisabled();
    await plus.click();
    await expect(minus).toBeEnabled();
    await minus.click();
    await expect(minus).toBeDisabled();

    // Raise to 3 and close — the running total is kept (side button 3 / obj 10).
    await plus.click();
    await page.getByRole("button", { name: "Fermer", exact: true }).click();
    await expect(openScores).toContainText("3/10");

    // Reopening shows the kept total (− still enabled, not reset).
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

    // Every player is scored at end, not just the winner (others keep their
    // starting 2) — no null score is left behind.
    const admin = adminClient();
    const { data: gps } = await admin
      .from("game_players")
      .select("score")
      .eq("game_id", gameId);

    expect(gps?.length).toBe(CATAN_MIN_PLAYERS);
    expect(gps?.every(r => r.score !== null)).toBe(true);
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
