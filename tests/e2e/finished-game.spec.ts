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

    // No tie → the winner is unambiguous (top scorer), so nothing is asked.
    await expect(page.getByText("qui a gagné")).toBeHidden();

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

    expect(rows).toHaveLength(2);
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

    // The tie surfaces the question; only the two tied players are candidates
    // (the third, not tied for the lead, has no winner card).
    await expect(page.getByText("Égalité — qui a gagné ?")).toBeVisible();
    await expect(
      page.getByRole("button", { name: names[2], exact: true }),
    ).toHaveCount(0);

    // Neither is proposed: until the table designates one, there is nothing to
    // record and the party can't be filed.
    const save = page.getByRole("button", { name: "Enregistrer la partie" });

    await expect(save).toBeDisabled();

    await page.getByRole("button", { name: names[1], exact: true }).click();
    await save.click();
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

test("records a tie left unbroken as a shared victory (two winners)", async ({
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
    await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
    }

    await page.getByRole("spinbutton", { name: names[0] }).fill("10");
    await page.getByRole("spinbutton", { name: names[1] }).fill("10");

    // Sharing it is a choice of its own, not what happens when nobody answers.
    await page.getByRole("button", { name: "Victoire partagée" }).click();
    await page.getByRole("button", { name: "Enregistrer la partie" }).click();
    await expect(page).toHaveURL(/\/games$/);

    const { data: gps } = await admin
      .from("game_players")
      .select("is_winner, player_id, game_id")
      .in("player_id", ids);
    const rows = gps ?? [];
    gameId = rows[0]?.game_id as string;

    expect(rows.filter(r => r.is_winner)).toHaveLength(2);

    // The ended list credits both names, and the game keeps the ex æquo trail.
    const finished = page.locator("details", {
      has: page.getByText("Terminées"),
    });
    await finished.locator("summary").click();
    await expect(page.getByText(`🏆 ${names[0]} et ${names[1]}`)).toBeVisible();

    const { data: game } = await admin
      .from("games")
      .select("tie_break")
      .eq("id", gameId)
      .single();

    expect((game?.tie_break as { shared: boolean } | null)?.shared).toBe(true);
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
  // Each recorded 32 pts = an all-"2" sheet (11 cats × 2 = 22, + 2 per biome
  // line's tied placement × 5 = 10).
  await admin.from("game_players").insert([
    {
      game_id: gameId,
      player_id: ids[0],
      seat_order: 0,
      is_winner: true,
      score: 32,
    },
    {
      game_id: gameId,
      player_id: ids[1],
      seat_order: 1,
      is_winner: false,
      score: 32,
    },
  ]);

  try {
    await page.goto(`/games/${gameId}/play`);

    // The final-score slide-over offers to add the missing per-category detail.
    await page.getByRole("button", { name: "Voir le score final" }).click();
    const panel = page.getByRole("dialog", { name: "Score final" });
    await panel
      .getByRole("button", { name: "Ajouter le détail des points" })
      .click();

    const cells = panel.getByRole("spinbutton");
    const count = await cells.count();
    const save = panel.getByRole("button", {
      name: "Enregistrer",
      exact: true,
    });
    const mismatch = panel.getByText(/Le total des catégories doit égaler/);

    // All 3s → totals (43) don't match the recorded 32 → saving is blocked.
    for (let i = 0; i < count; i++) {
      await cells.nth(i).fill("3");
    }
    await expect(mismatch).toBeVisible();
    await expect(save).toBeDisabled();

    // Correct to 2s → totals (32) match → the total shows and saving is allowed.
    for (let i = 0; i < count; i++) {
      await cells.nth(i).fill("2");
    }
    await expect(panel.getByText("32 pts").first()).toBeVisible();
    await expect(mismatch).toBeHidden();
    await save.click();

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

    expect(rows).toHaveLength(2);
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

test("records a pair-scored game on its shared piles", async ({ page }) => {
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

    await page.getByRole("button", { name: "Splito", exact: true }).click();
    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
    }

    // Unlike a category sheet, the piles ARE what the table wrote down, so the
    // form opens on them rather than on a total nobody worked out.
    const save = page.getByRole("button", { name: "Enregistrer la partie" });

    await expect(page.getByText("Encore 3 tas à compter")).toBeVisible();
    await expect(save).toBeDisabled();

    const piles = [
      page.getByRole("button", {
        name: `Tas entre ${names[0]} et ${names[1]}`,
      }),
      page.getByRole("button", {
        name: `Tas entre ${names[1]} et ${names[2]}`,
      }),
      page.getByRole("button", {
        name: `Tas entre ${names[2]} et ${names[0]}`,
      }),
    ];

    await piles[0].click();
    await piles[1].click();
    await page.getByRole("button", { name: "Ajouter un point au tas" }).click();
    await piles[2].click();
    await page.getByRole("button", { name: "Retirer un point au tas" }).click();

    // 6 / 7 / 5 round the ring → each player multiplies the two flanking his
    // seat, so the middle one wins on 6 × 7.
    await expect(page.getByLabel(`Score de ${names[1]}`)).toContainText(
      "6 × 7 = 42",
    );
    await expect(save).toBeEnabled();
    await save.click();

    await expect(page).toHaveURL(/\/games$/);

    const { data: gps } = await admin
      .from("game_players")
      .select("game_id, score, is_winner, score_breakdown, player_id")
      .in("player_id", ids);
    const rows = gps ?? [];
    gameId = rows[0]?.game_id as string;

    const winner = rows.find(r => r.player_id === ids[1]);

    expect(winner?.is_winner).toBe(true);
    expect(winner?.score).toBe(42);
    // The two piles behind the total are kept, so the recap can spell it out.
    expect(winner?.score_breakdown).toEqual({ left: 6, right: 7 });
    expect(rows.find(r => r.player_id === ids[0])?.score).toBe(30);
    expect(rows.find(r => r.player_id === ids[2])?.score).toBe(35);
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});

/**
 * The tie a pair-scored game falls into all by itself: three equal piles round
 * the ring give every seat the same product. The form must then name Splito's
 * own rule, refuse to file the night until somebody is designated, and take
 * back the winner alone — never the card count the table settled it on.
 */
test("names the game's tie-break rule and waits for an answer", async ({
  page,
}) => {
  const names = await seedPlayers(3);
  const admin = adminClient();
  let gameId: string | undefined;

  try {
    await page.goto("/games/finished");
    await page.getByRole("button", { name: "Splito", exact: true }).click();
    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
    }

    // Left at the count they are seeded with, the three piles are equal — so
    // are the three products, and the table is level.
    for (const pair of [
      [names[0], names[1]],
      [names[1], names[2]],
      [names[2], names[0]],
    ]) {
      await page
        .getByRole("button", { name: `Tas entre ${pair[0]} et ${pair[1]}` })
        .click();
    }

    const save = page.getByRole("button", { name: "Enregistrer la partie" });

    await expect(page.getByText("Égalité — qui a gagné ?")).toBeVisible();
    await expect(page.getByText("Le moins de cartes Splito")).toBeVisible();
    await expect(save).toBeDisabled();

    // The rule is named, not applied: no field asks for the card count.
    await expect(
      page.getByRole("spinbutton", { name: /cartes Splito/ }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: names[2], exact: true }).click();
    await expect(save).toBeEnabled();
    await save.click();

    await expect(page).toHaveURL(/\/games$/);

    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const winnerId = (seeded ?? []).find(p => p.name === names[2])?.id;
    const { data: gps } = await admin
      .from("game_players")
      .select("game_id, is_winner, player_id")
      .in(
        "player_id",
        (seeded ?? []).map(p => p.id),
      );
    const rows = gps ?? [];
    gameId = rows[0]?.game_id as string;

    expect(rows.filter(r => r.is_winner)).toHaveLength(1);
    expect(rows.find(r => r.is_winner)?.player_id).toBe(winnerId);
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }

    await admin.from("players").delete().in("name", names);
  }
});

/**
 * Which boxes the form offers. Only a co-operative one is turned away — it has
 * no individual result to type in here yet. A **hybrid** game (Splito: the
 * points come off the piles a player shares with his two neighbours) is scored
 * against the table like any other and must be offered, which an allow-list on
 * `competitive` silently got wrong.
 */
test("offers a hybrid game but not a cooperative one", async ({ page }) => {
  const admin = adminClient();
  const coopName = `E2E Coop-${Date.now().toString(36)}`;
  let coopId = "";

  try {
    const { data, error } = await admin
      .from("boardgames")
      .insert({
        name: coopName,
        kind: "cooperative",
        min_players: 2,
        max_players: 4,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to seed coop boardgame: ${error.message}`);
    }

    coopId = data.id as string;

    await page.goto("/games/finished");
    await expect(
      page.getByRole("button", { name: "Splito", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: coopName, exact: true }),
    ).toHaveCount(0);
  } finally {
    if (coopId) {
      await admin.from("boardgames").delete().eq("id", coopId);
    }
  }
});
