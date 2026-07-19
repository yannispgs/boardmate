import { expect, test } from "@playwright/test";

import { adminClient, CATAN_ID, seedPlayers } from "./utils/supabase";

/**
 * The turn-order breakdown on the stats "Jeux" tab (full-suite only —
 * untagged), shown for games that opt into it (Catan). Seeds a couple of ended
 * Catan games with distinct seats and winners, then checks the "Selon l'ordre
 * de jeu" table renders its buckets.
 */
test("shows the turn-order breakdown for Catan in the game stats", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = (seeded ?? []).map(p => p.id as string);

    // Two 3-seat Catan games; the first seat wins one, the last seat the other.
    async function seedCatan(scoresBySeat: number[], winnerSeat: number) {
      const { data: game } = await admin
        .from("games")
        .insert({
          boardgame_id: CATAN_ID,
          status: "ended",
          round: 1,
          turn: 1,
          ended_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      const gameId = game?.id as string;
      gameIds.push(gameId);

      await admin.from("game_players").insert(
        ids.map((player_id, seat) => ({
          game_id: gameId,
          player_id,
          seat_order: seat,
          is_winner: seat === winnerSeat,
          score: scoresBySeat[seat],
        })),
      );
    }

    await seedCatan([10, 8, 6], 0);
    await seedCatan([6, 8, 10], 2);

    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();

    // Catan tracks turn-order stats → the table and its buckets are shown.
    await expect(page.getByText("Selon l'ordre de jeu")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Premier" })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Intermédiaire" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "Dernier" })).toBeVisible();

    // The normalised "Position moy." carries an info bubble: it opens on click
    // and dismisses when clicking outside.
    const bubble = page.getByTestId("info-bubble");

    await expect(bubble).toBeHidden();
    await page
      .getByRole("button", { name: "Détails sur la position moyenne" })
      .click();
    await expect(bubble).toBeVisible();
    await expect(bubble).toContainText("normalisé par nombre de joueurs");
    await page.getByText("Selon l'ordre de jeu").click();
    await expect(bubble).toBeHidden();
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }
    await admin.from("players").delete().in("name", names);
  }
});
