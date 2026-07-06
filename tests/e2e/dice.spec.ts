import { expect, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
import {
  adminClient,
  CATAN_ID,
  CATAN_MIN_PLAYERS,
  seedPlayers,
} from "./utils/supabase";

/**
 * Dice tracking (Catan, full-suite only — untagged): the one-tap histogram
 * records rolls (persisted, so they survive a reload) and the live-stats modal
 * charts them in draw order.
 */
test("records dice rolls and charts them in draw order", async ({ page }) => {
  const players = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    // Roll 7 three times and 5 once — one tap each.
    await page.getByRole("button", { name: "Lancer de 7" }).click();
    await page.getByRole("button", { name: "Lancer de 5" }).click();
    await page.getByRole("button", { name: "Lancer de 7" }).click();
    await page.getByRole("button", { name: "Lancer de 7" }).click();

    // The 7 bar shows its count; the last roll (7) is the current value.
    const seven = page.getByRole("button", { name: "Lancer de 7" });

    await expect(seven.getByText("3", { exact: true })).toBeVisible();

    // Rolls persist: a reload rehydrates the same counts from the backend.
    await page.reload();
    await expect(page).toHaveURL(/\/play$/);
    await expect(
      page
        .getByRole("button", { name: "Lancer de 7" })
        .getByText("3", { exact: true }),
    ).toBeVisible();

    // The live-stats modal charts the sequence in draw order.
    await page.getByRole("button", { name: "Ouvrir les statistiques" }).click();
    await expect(page.getByText("Tirages de dés — dans l'ordre")).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Tirages de dés dans l'ordre" }),
    ).toBeVisible();
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("charts the rolls and per-value écart on the end screen", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(CATAN_MIN_PLAYERS);
  let gameId = "";

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = (seeded ?? []).map(p => p.id as string);

    const { data: game } = await admin
      .from("games")
      .insert({ boardgame_id: CATAN_ID, status: "ended", round: 4, turn: 12 })
      .select("id")
      .single();
    gameId = game?.id as string;

    await admin.from("game_players").insert(
      ids.map((player_id, i) => ({
        game_id: gameId,
        player_id,
        seat_order: i,
        is_winner: i === 0,
        score: i === 0 ? 10 : 6,
      })),
    );

    // 7 comes up far more than the odds (→ green), 3 never (→ red).
    const seq = [7, 7, 7, 7, 7, 7, 8, 6, 9, 5, 10, 4, 2, 12, 7, 7];
    let t = Date.now();
    await admin.from("dice_rolls").insert(
      seq.map(value => ({
        game_id: gameId,
        value,
        created_at: new Date(t++).toISOString(),
      })),
    );

    await page.goto(`/games/${gameId}/play`);

    await expect(
      page.getByRole("img", { name: "Tirages de dés dans l'ordre" }),
    ).toBeVisible();

    // 7 rolled 8× and expected ~2.7 → a green "over" écart.
    const seven = page.getByRole("listitem").filter({ hasText: "8×" });

    await expect(seven).toContainText("+");
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});
