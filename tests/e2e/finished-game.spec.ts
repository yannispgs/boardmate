import { expect, test } from "@playwright/test";

import { adminClient, CATAN_NAME, seedPlayers } from "./utils/supabase";

/**
 * Recording an already-finished game from the Parties list (full-suite only —
 * untagged). It should create an `ended` game with the entered scores and
 * winner — no play history — so it counts in the stats. We verify the row
 * directly, then clean it up.
 */
test("records a finished game with final scores and a winner", async ({
  page,
}) => {
  const names = await seedPlayers(2);
  const admin = adminClient();
  const { data: seeded } = await admin
    .from("players")
    .select("id, name")
    .in("name", names);
  const ids = (seeded ?? []).map(p => p.id);
  let gameId: string | undefined;

  try {
    await page.goto("/games");
    await page
      .getByRole("link", { name: "Ajouter une partie terminée" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Ajouter une partie terminée" }),
    ).toBeVisible();

    // Game → players → scores.
    await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
    }

    await page.getByRole("spinbutton", { name: names[0] }).fill("10");
    await page.getByRole("spinbutton", { name: names[1] }).fill("8");

    // No tie → the winner is unambiguous (top scorer), so no picker is shown.
    await expect(page.getByText("Vainqueur")).toBeHidden();

    await page.getByRole("button", { name: "Enregistrer la partie" }).click();

    // Back to the Parties list on success.
    await expect(page).toHaveURL(/\/games$/);
    await expect(page.getByRole("heading", { name: "Parties" })).toBeVisible();

    // The game was stored as ended, with the winner and scores.
    const { data: gps } = await admin
      .from("game_players")
      .select("game_id, score, is_winner, games(status), player_id")
      .in("player_id", ids);
    const rows = gps ?? [];

    expect(rows.length).toBe(2);
    gameId = rows[0]?.game_id as string;

    const winnerRow = rows.find(r => r.player_id === ids[0]);
    const loserRow = rows.find(r => r.player_id === ids[1]);

    expect(winnerRow?.is_winner).toBe(true);
    expect(winnerRow?.score).toBe(10);
    expect(loserRow?.is_winner).toBe(false);
    expect(loserRow?.score).toBe(8);
    expect((winnerRow?.games as unknown as { status: string })?.status).toBe(
      "ended",
    );
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});

test("asks for the winner only on a tie, among the tied players", async ({
  page,
}) => {
  const names = await seedPlayers(3);
  const admin = adminClient();
  const { data: seeded } = await admin
    .from("players")
    .select("id, name")
    .in("name", names);
  const ids = (seeded ?? []).map(p => p.id);
  let gameId: string | undefined;

  try {
    await page.goto("/games");
    await page
      .getByRole("link", { name: "Ajouter une partie terminée" })
      .click();
    await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
    }

    // Two players tie at the top; the third is lower.
    await page.getByRole("spinbutton", { name: names[0] }).fill("10");
    await page.getByRole("spinbutton", { name: names[1] }).fill("10");
    await page.getByRole("spinbutton", { name: names[2] }).fill("5");

    // The tie surfaces the picker; only the two tied players are candidates
    // (the third, not tied for the lead, has no winner card).
    await expect(page.getByText("Vainqueur")).toBeVisible();
    await expect(
      page.getByRole("button", { name: names[2], exact: true }),
    ).toHaveCount(0);

    // Override the default (first tied) → the second tied player wins.
    await page.getByRole("button", { name: names[1], exact: true }).click();
    await page.getByRole("button", { name: "Enregistrer la partie" }).click();
    await expect(page).toHaveURL(/\/games$/);

    const { data: gps } = await admin
      .from("game_players")
      .select("is_winner, player_id, game_id")
      .in("player_id", ids);
    const rows = gps ?? [];
    gameId = rows[0]?.game_id as string;

    expect(rows.find(r => r.player_id === ids[1])?.is_winner).toBe(true);
    expect(rows.find(r => r.player_id === ids[0])?.is_winner).toBe(false);
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});

test("fills a category game's per-category detail after the fact", async ({
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
  // An ended Cascadia game recorded with totals only (no breakdown).
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
  await admin.from("game_players").insert([
    {
      game_id: gameId,
      player_id: ids[0],
      seat_order: 0,
      is_winner: true,
      score: 90,
    },
    {
      game_id: gameId,
      player_id: ids[1],
      seat_order: 1,
      is_winner: false,
      score: 80,
    },
  ]);

  try {
    await page.goto(`/games/${gameId}/play`);

    // The stats screen offers to add the missing per-category detail.
    await page
      .getByRole("button", { name: "Ajouter le détail des points" })
      .click();

    // Fill every category cell, then save.
    const cells = page.getByRole("spinbutton");
    const count = await cells.count();
    for (let i = 0; i < count; i++) {
      await cells.nth(i).fill("2");
    }
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();

    // Once saved, the game has a breakdown → the whole fill form (its grid
    // cells) disappears after the reload.
    await expect(page.getByRole("spinbutton")).toHaveCount(0);

    const { data: gps } = await admin
      .from("game_players")
      .select("score_breakdown")
      .eq("game_id", gameId);

    expect((gps ?? []).every(r => r.score_breakdown !== null)).toBe(true);
  } finally {
    await admin.from("games").delete().eq("id", gameId);
    await admin.from("players").delete().in("name", names);
  }
});

test("a category game can be recorded with just a total (detail optional)", async ({
  page,
}) => {
  const names = await seedPlayers(2);
  const admin = adminClient();
  const { data: seeded } = await admin
    .from("players")
    .select("id, name")
    .in("name", names);
  const ids = (seeded ?? []).map(p => p.id);
  let gameId: string | undefined;

  try {
    await page.goto("/games");
    await page
      .getByRole("link", { name: "Ajouter une partie terminée" })
      .click();

    await page.getByRole("button", { name: "Cascadia", exact: true }).click();
    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
    }

    // A category game offers the total/detail toggle. "Détail" reveals the
    // inline grid; "Score total" (the default) records just a total.
    await page.getByText("Détail par catégorie").click();
    await expect(
      page.getByRole("spinbutton", { name: `Ours — ${names[0]}` }),
    ).toBeVisible();

    await page.getByText("Score total", { exact: true }).click();
    await page.getByRole("spinbutton", { name: names[0] }).fill("92");
    await page.getByRole("spinbutton", { name: names[1] }).fill("77");
    await page.getByRole("button", { name: "Enregistrer la partie" }).click();

    await expect(page).toHaveURL(/\/games$/);

    const { data: gps } = await admin
      .from("game_players")
      .select("game_id, score, is_winner, score_breakdown, player_id")
      .in("player_id", ids);
    const rows = gps ?? [];

    expect(rows.length).toBe(2);
    gameId = rows[0]?.game_id as string;

    const winner = rows.find(r => r.player_id === ids[0]);

    expect(winner?.is_winner).toBe(true);
    expect(winner?.score).toBe(92);
    // Total-only entry stores no per-category breakdown.
    expect(winner?.score_breakdown).toBeNull();
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});
