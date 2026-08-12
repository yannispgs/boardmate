import { expect, test } from "@playwright/test";

import {
  adminClient,
  boardgameId,
  CATAN_ID,
  seedPlayers,
  TERRAFORMING_MARS_NAME,
} from "./utils/supabase";

/**
 * How far along a game is, as the games list words it (full-suite only —
 * untagged): Terraforming Mars is counted in generations, everything else in
 * laps. Reading a Terraforming Mars game as « Tour 14 » names something nobody
 * at that table would recognise.
 */
test("counts each game in its own unit in the games list", async ({ page }) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = names.map(
      n => (seeded ?? []).find(p => p.name === n)?.id as string,
    );

    for (const [boardgame, stage] of [
      [await boardgameId(TERRAFORMING_MARS_NAME), 4],
      [CATAN_ID, 1],
    ] as const) {
      const { data: game } = await admin
        .from("games")
        .insert({
          boardgame_id: boardgame,
          status: "ongoing",
          round: 7,
          turn: 1,
          stage,
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
    }

    await page.goto("/games");

    const mars = page
      .getByRole("listitem")
      .filter({ hasText: "Terraforming Mars" })
      .first();
    const catan = page
      .getByRole("listitem")
      .filter({ hasText: "Catan" })
      .first();

    // Same `round` on both rows — only the unit each is read in differs.
    await expect(mars.getByText("Génération 4")).toBeVisible();
    await expect(mars.getByText("Tour 7")).toHaveCount(0);
    await expect(catan.getByText("Tour 7")).toBeVisible();
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }
    await admin.from("players").delete().in("name", names);
  }
});
