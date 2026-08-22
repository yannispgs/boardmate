import { expect, test } from "@playwright/test";

import {
  adminClient,
  boardgameId,
  seedPlayers,
  TERRAFORMING_MARS_NAME,
} from "./utils/supabase";

const PLAYER_COUNT = 3;

/**
 * The phase strip of a Terraforming Mars game (full-suite only — untagged): the
 * generation is laid out as its three phases, each under its rank and separated
 * by a chevron, and closing one moves the light to the next.
 */
test("lays the generation out as ranked phases and lights the current one", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(PLAYER_COUNT);
  let gameId = "";

  try {
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
    gameId = game?.id as string;

    await admin.from("game_players").insert(
      ids.map((player_id, i) => ({
        game_id: gameId,
        player_id,
        seat_order: i,
      })),
    );

    await page.goto(`/games/${gameId}/play`);

    // The three phases of the base game, each announcing its rank so the strip
    // and the rulebook use the same numbers.
    const strip = page.getByRole("list").filter({ hasText: "Phase 1" });

    await expect(strip.getByText("Phase 1", { exact: true })).toBeVisible();
    await expect(strip.getByText("Découverte", { exact: true })).toBeVisible();
    await expect(strip.getByText("Phase 2", { exact: true })).toBeVisible();
    await expect(
      strip.getByText("Réalisation des projets", { exact: true }),
    ).toBeVisible();
    await expect(strip.getByText("Phase 3", { exact: true })).toBeVisible();
    await expect(
      strip.getByText("Production des ressources", { exact: true }),
    ).toBeVisible();

    // Two phases, two joins: the strip reads as an order, not as a set.
    await expect(strip.locator("svg")).toHaveCount(2);

    // Découverte is played all at once, so the table closes it itself and is
    // told where that lands.
    await expect(page.getByText("Tour de", { exact: false })).toHaveCount(0);
    await expect(
      page.getByText("Ensuite : Réalisation des projets"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Phase terminée →" }).click();

    // The light moves on: the projects phase is the one with turns, so the
    // per-player timer and the ribbon come back.
    await expect(
      page.getByText("Ensuite : Réalisation des projets"),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Passe" })).toBeVisible();
  } finally {
    if (gameId !== "") {
      await admin.from("games").delete().eq("id", gameId);
    }

    await admin.from("players").delete().in("name", names);
  }
});
