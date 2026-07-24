import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * The Cascadia point-distribution charts in the stats (full-suite only —
 * untagged). Seeds a Cascadia game with a complete per-category breakdown, then
 * checks the donut + Globale/Animaux toggle on the Jeux tab and on a player's
 * detail. Only complete-breakdown games feed these charts.
 */
const FULL: Record<string, number> = {
  ours: 5,
  buse: 3,
  renard: 4,
  wapiti: 2,
  saumon: 6,
  foret: 7,
  montagne: 1,
  prairie: 5,
  marais: 3,
  riviere: 2,
  pommesDePin: 4,
};

const total = (b: Record<string, number>) =>
  Object.values(b).reduce((s, x) => s + x, 0);

test("charts the Cascadia point distribution in the stats", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(2);
  const { data: seeded } = await admin
    .from("players")
    .select("id, name")
    .in("name", names);
  const ids = (seeded ?? []).map(p => p.id);
  const { data: cascadia } = await admin
    .from("boardgames")
    .select("id")
    .eq("name", "Cascadia")
    .single();
  let gameId: string | undefined;

  try {
    const b1 = FULL;
    const b0 = { ...FULL, ours: 1, saumon: 2 };
    const { data: game } = await admin
      .from("games")
      .insert({
        boardgame_id: cascadia?.id,
        status: "ended",
        round: 1,
        turn: 1,
        ended_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    gameId = game?.id as string;
    await admin.from("game_players").insert([
      {
        game_id: gameId,
        player_id: ids[0],
        seat_order: 0,
        is_winner: true,
        score: total(b1),
        score_breakdown: b1,
      },
      {
        game_id: gameId,
        player_id: ids[1],
        seat_order: 1,
        is_winner: false,
        score: total(b0),
        score_breakdown: b0,
      },
    ]);

    await page.goto("/stats");

    // Jeux tab → Cascadia → the distribution chart + Globale/Animaux toggle.
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: "Cascadia", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Répartition des points" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Globale" })).toBeVisible();

    // Toggle to the animal detail → an animal appears in the legend.
    await page.getByRole("button", { name: "Animaux" }).click();
    await expect(page.getByText("Ours", { exact: true })).toBeVisible();

    // Joueurs tab → a player's detail carries the same chart.
    await page.getByRole("button", { name: "Joueurs", exact: true }).click();
    await page.getByRole("button", { name: names[0] }).first().click();
    await expect(page.getByRole("button", { name: "Globale" })).toBeVisible();
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});
