import { expect, test } from "@playwright/test";

import { adminClient, CATAN_ID, seedPlayers } from "./utils/supabase";

const CASCADIA_CATS = [
  "ours",
  "buse",
  "renard",
  "wapiti",
  "saumon",
  "foret",
  "montagne",
  "prairie",
  "marais",
  "riviere",
  "pommesDePin",
];

/**
 * The finished-game screen exposes the final score through a right slide-over
 * (full-suite only — untagged). For a category game (Cascadia) recorded with
 * its per-category detail, the panel shows the totals and can expand the full
 * scoresheet; a total-only game (Catan) shows just the totals, no detail toggle.
 */
test("shows the final score in a right slide-over, with category detail", async ({
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
  const gameId = game?.id as string;

  // Each player recorded 32 pts with a full all-"2" per-category breakdown.
  const breakdown = Object.fromEntries(CASCADIA_CATS.map(k => [k, 2]));
  await admin.from("game_players").insert([
    {
      game_id: gameId,
      player_id: ids[0],
      seat_order: 0,
      is_winner: true,
      score: 32,
      score_breakdown: breakdown,
    },
    {
      game_id: gameId,
      player_id: ids[1],
      seat_order: 1,
      is_winner: false,
      score: 32,
      score_breakdown: breakdown,
    },
  ]);

  try {
    await page.goto(`/games/${gameId}/play`);

    // The score tab slides in the final-score panel.
    await page.getByRole("button", { name: "Voir le score final" }).click();

    const panel = page.getByRole("dialog", { name: "Score final" });
    await expect(
      panel.getByRole("heading", { name: "Score final" }),
    ).toBeVisible();
    await expect(panel.getByText("32").first()).toBeVisible();

    // Both scored 32, but a competitive game has a single winner: only the
    // recorded winner is 1st (🏆), the co-leader is 2nd — no shared rank 1.
    await expect(panel.getByText("🏆")).toHaveCount(1);
    await expect(panel.getByText("2", { exact: true })).toBeVisible();

    // The category detail is hidden until expanded, then reveals the scoresheet.
    await expect(panel.getByText("Feuille de scores")).toBeHidden();
    await panel
      .getByRole("button", { name: "Voir le détail des points" })
      .click();
    await expect(panel.getByText("Feuille de scores")).toBeVisible();
    await expect(panel.getByText("Ours")).toBeVisible();
  } finally {
    await admin.from("games").delete().eq("id", gameId);
    await admin.from("players").delete().in("name", names);
  }
});

test("shows a total-only game's score with no category detail toggle", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const { data: seeded } = await admin
    .from("players")
    .select("id, name")
    .in("name", names);
  const ids = (seeded ?? []).map(p => p.id);
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

  await admin.from("game_players").insert([
    {
      game_id: gameId,
      player_id: ids[0],
      seat_order: 0,
      is_winner: true,
      score: 10,
    },
    {
      game_id: gameId,
      player_id: ids[1],
      seat_order: 1,
      is_winner: false,
      score: 7,
    },
    {
      game_id: gameId,
      player_id: ids[2],
      seat_order: 2,
      is_winner: false,
      score: 5,
    },
  ]);

  try {
    await page.goto(`/games/${gameId}/play`);
    await page.getByRole("button", { name: "Voir le score final" }).click();

    const panel = page.getByRole("dialog", { name: "Score final" });
    await expect(panel.getByText("10")).toBeVisible();
    // No per-category detail for a total-only game.
    await expect(
      panel.getByRole("button", { name: "Voir le détail des points" }),
    ).toHaveCount(0);
  } finally {
    await admin.from("games").delete().eq("id", gameId);
    await admin.from("players").delete().in("name", names);
  }
});
