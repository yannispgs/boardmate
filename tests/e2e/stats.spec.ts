import { expect, test } from "@playwright/test";

import { adminClient, CATAN_ID, seedPlayers } from "./utils/supabase";

/**
 * The global statistics page (full-suite only — untagged): averages of every
 * finished game, with the boardgame / player filters narrowing the set. Seeds a
 * couple of ended games directly (service role) so the aggregation has data.
 */
test("shows player averages and per-game averages across the two tabs", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];
  let otherBoardgameId = "";

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = (seeded ?? []).map(p => p.id as string);

    const { data: other } = await admin
      .from("boardgames")
      .insert({
        name: `Zzz-${Date.now().toString(36)}`,
        min_players: 1,
        max_players: 4,
      })
      .select("id")
      .single();
    otherBoardgameId = other?.id as string;

    async function seedEndedGame(boardgameId: string, winnerIdx: number) {
      const { data: game } = await admin
        .from("games")
        .insert({
          boardgame_id: boardgameId,
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
        ids.map((player_id, i) => ({
          game_id: gameId,
          player_id,
          seat_order: i,
          is_winner: i === winnerIdx,
          score: 10 - i,
        })),
      );
      await admin.from("game_turns").insert(
        ids.map((player_id, i) => ({
          game_id: gameId,
          player_id,
          round: 1,
          turn_no: i + 1,
          duration_s: 30 + i * 10,
        })),
      );
    }

    // Two Catan games (player 0 wins both) + one on the other boardgame.
    await seedEndedGame(CATAN_ID, 0);
    await seedEndedGame(CATAN_ID, 0);
    await seedEndedGame(otherBoardgameId, 1);

    await page.goto("/stats");

    // Joueurs tab (default): across all 3 games player 0 won 2 → 67%, on top.
    await expect(page.getByText("Classement des joueurs")).toBeVisible();

    const cards = page.getByRole("listitem");

    await expect(cards.first()).toContainText(names[0]);
    await expect(cards.first()).toContainText("67%");

    // Sort by the time index: player 2 took the most time each game → on top.
    await page.getByRole("button", { name: "Temps" }).click();
    await expect(cards.first()).toContainText(names[2]);

    // Sort back by win rate: player 0 (67%) returns to the top.
    await page.getByRole("button", { name: "Vict." }).click();
    await expect(cards.first()).toContainText(names[0]);

    // Jeux tab: it opens on the first game (Catan, alphabetical) where player 0
    // won both → 100%.
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await expect(
      page.getByText("Statistiques des joueurs sur ce jeu"),
    ).toBeVisible();

    const p0Card = page.getByRole("listitem").filter({ hasText: names[0] });

    await expect(p0Card).toContainText("100%");

    // Pick the other game: player 0 didn't win its only game → 0%.
    await page.getByRole("button", { name: /^Zzz-/ }).first().click();

    await expect(
      page.getByRole("listitem").filter({ hasText: names[0] }),
    ).toContainText("0%");
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }
    if (otherBoardgameId) {
      await admin.from("boardgames").delete().eq("id", otherBoardgameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});

test("recomputes the ranking from games where the selected players played", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];
  let bgId = "";

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = names.map(
      n => (seeded ?? []).find(p => p.name === n)?.id as string,
    );

    // A boardgame that allows 2-player games (so one game can exclude a player).
    const { data: bg } = await admin
      .from("boardgames")
      .insert({
        name: `Prez-${Date.now().toString(36)}`,
        min_players: 1,
        max_players: 4,
      })
      .select("id")
      .single();
    bgId = bg?.id as string;

    async function seed(playerIdxs: number[], winnerIdx: number) {
      const { data: game } = await admin
        .from("games")
        .insert({
          boardgame_id: bgId,
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
        playerIdxs.map((idx, seat) => ({
          game_id: gameId,
          player_id: ids[idx],
          seat_order: seat,
          is_winner: idx === winnerIdx,
          score: 5,
        })),
      );
      await admin.from("game_turns").insert(
        playerIdxs.map((idx, seat) => ({
          game_id: gameId,
          player_id: ids[idx],
          round: 1,
          turn_no: seat + 1,
          duration_s: 20,
        })),
      );
    }

    // Player 0 wins two of three games; the third has no player 2.
    await seed([0, 1, 2], 0);
    await seed([0, 1, 2], 2);
    await seed([0, 1], 0);

    await page.goto("/stats");

    const p0Row = () =>
      page.getByRole("listitem").filter({ hasText: names[0] });

    // Across all 3 games: player 0 won 2 → 67%.
    await expect(p0Row()).toContainText("67%");

    // Keep only games where player 2 was present → drops the 2-player game.
    await page.getByRole("button", { name: "Ouvrir la liste" }).click();
    await page.getByRole("button", { name: names[2], exact: true }).click();
    // Close the dropdown (re-tap the trigger) so its own list items don't
    // shadow the table rows.
    await page.getByRole("button", { name: "Ouvrir la liste" }).click();

    // Player 0 now won 1 of 2 → 50%.
    await expect(p0Row()).toContainText("50%");
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }
    if (bgId) {
      await admin.from("boardgames").delete().eq("id", bgId);
    }
    await admin.from("players").delete().in("name", names);
  }
});
