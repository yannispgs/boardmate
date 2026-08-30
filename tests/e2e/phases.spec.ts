import { expect, test } from "@playwright/test";

import { pausedBadge } from "./utils/play-screen";
import {
  adminClient,
  boardgameId,
  seedPlayers,
  TERRAFORMING_MARS_NAME,
} from "./utils/supabase";

const PLAYER_COUNT = 3;

/**
 * A Terraforming Mars game sat at its first generation, seated in the order the
 * players were given. Straight through the admin client: what these tests are
 * about starts on the play screen, not in the funnel that leads to it.
 */
async function seedGame(names: string[]): Promise<string> {
  const admin = adminClient();
  const { data: seeded } = await admin
    .from("players")
    .select("id, name")
    .in("name", names);
  const ids = names.map(
    n => (seeded ?? []).find(p => p.name === n)?.id as string,
  );

  const { data: game } = await admin
    .from("games")
    .insert({
      boardgame_id: await boardgameId(TERRAFORMING_MARS_NAME),
      status: "ongoing",
      round: 1,
      turn: 1,
      stage: 1,
      current_player_id: ids[0],
    })
    .select("id")
    .single();
  const gameId = game?.id as string;

  await admin.from("game_players").insert(
    ids.map((player_id, i) => ({
      game_id: gameId,
      player_id,
      seat_order: i,
    })),
  );

  return gameId;
}

/** Drops the game and its players, whatever the test did in between. */
async function cleanUp(gameId: string, names: string[]): Promise<void> {
  const admin = adminClient();

  if (gameId !== "") {
    await admin.from("games").delete().eq("id", gameId);
  }

  await admin.from("players").delete().in("name", names);
}

/**
 * The phase strip of a Terraforming Mars game (full-suite only — untagged): the
 * generation is laid out as its three phases, each under its rank and separated
 * by a chevron, and closing one moves the light to the next.
 */
test("lays the generation out as ranked phases and lights the current one", async ({
  page,
}) => {
  const names = await seedPlayers(PLAYER_COUNT);
  let gameId = "";

  try {
    gameId = await seedGame(names);

    await page.goto(`/games/${gameId}/play`);

    // The three phases of the base game, each announcing its rank so the strip
    // and the rulebook use the same numbers.
    const strip = page.getByRole("list").filter({ hasText: "Phase 1" });

    await expect(strip.getByText("Phase 1", { exact: true })).toBeVisible();
    await expect(strip.getByText("Découverte", { exact: true })).toBeVisible();
    await expect(strip.getByText("Phase 2", { exact: true })).toBeVisible();
    await expect(strip.getByText("Projets", { exact: true })).toBeVisible();
    await expect(strip.getByText("Phase 3", { exact: true })).toBeVisible();
    await expect(strip.getByText("Production", { exact: true })).toBeVisible();

    // Two phases, two joins: the strip reads as an order, not as a set.
    await expect(strip.locator("svg")).toHaveCount(2);

    // Découverte is played all at once, so the table closes it itself and is
    // told where that lands.
    await expect(page.getByText("Tour de", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Ensuite : Projets")).toBeVisible();

    await page.getByRole("button", { name: "Phase terminée →" }).click();

    // The light moves on: the projects phase is the one with turns, so the
    // per-player timer and the ribbon come back.
    await expect(page.getByText("Ensuite : Projets")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Passe" })).toBeVisible();
  } finally {
    await cleanUp(gameId, names);
  }
});

/**
 * Correcting the table stopwatch — the phase nobody thought to close on time.
 * The point is the banked figure, not the display: the seconds the phase is
 * recorded with have to be the corrected ones, or the per-phase statistics
 * read a wait for the box that nobody actually played.
 */
test("corrects the phase stopwatch, and banks the corrected time", async ({
  page,
}) => {
  const names = await seedPlayers(PLAYER_COUNT);
  let gameId = "";

  try {
    gameId = await seedGame(names);

    await page.goto(`/games/${gameId}/play`);

    // Hold the stopwatch still for the rest of the test, so the figures below
    // are the correction's and not the clock's own drift.
    await page.getByRole("button", { name: "Mettre en pause" }).click();
    await expect(pausedBadge(page)).toBeVisible();

    await page
      .getByRole("button", { name: "Corriger le temps écoulé" })
      .click();

    const sheet = page.getByRole("dialog", {
      name: "Corriger le temps écoulé",
    });
    await page.getByRole("textbox", { name: "Temps écoulé" }).fill("2:00");
    await expect(sheet).toContainText("2:00");

    // A step moves the typed time, upwards on a stopwatch.
    await page.getByRole("button", { name: "Ajouter 30 s" }).click();
    await expect(
      page.getByRole("textbox", { name: "Temps écoulé" }),
    ).toHaveValue("2:30");

    await page.getByRole("button", { name: "Appliquer" }).click();

    // The disc reads the corrected time, and the phase is still on hold.
    await expect(page.getByText("2:30")).toBeVisible();
    await expect(pausedBadge(page)).toBeVisible();

    await page.getByRole("button", { name: "Phase terminée →" }).click();
    await expect(page.getByText("Ensuite : Projets")).toHaveCount(0);

    // What the phase banked is exactly what the table corrected it to: the
    // stopwatch was on hold throughout, so nothing was added after.
    const { data: banked } = await adminClient()
      .from("game_phases")
      .select("phase_key, duration_s")
      .eq("game_id", gameId)
      .single();

    expect(banked?.phase_key).toBe("discovery");
    expect(banked?.duration_s).toBe(150);
  } finally {
    await cleanUp(gameId, names);
  }
});
