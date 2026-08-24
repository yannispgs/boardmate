import { expect, test } from "@playwright/test";

import {
  adminClient,
  boardgameId,
  CATAN_ID,
  seedPlayers,
} from "./utils/supabase";

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
    const presence = page.getByRole("button", {
      name: "Ouvrir la liste : Avec les joueurs",
    });

    await presence.click();
    await page.getByRole("button", { name: names[2], exact: true }).click();
    // Close the dropdown (re-tap the trigger) so its own list items don't
    // shadow the table rows.
    await presence.click();

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

/**
 * The games filter on the "Joueurs" tab (full-suite only — untagged): every
 * boardgame counts until one is unticked, the box empties in one tap and fills
 * back in one tap, and it always spells out the shorter of the two sides.
 */
test("narrows the player ranking down to one boardgame in two taps", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];
  const boardgameIds: string[] = [];

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = (seeded ?? []).map(p => p.id as string);

    async function seedBoardgame(name: string) {
      const { data } = await admin
        .from("boardgames")
        .insert({ name, min_players: 1, max_players: 4 })
        .select("id")
        .single();
      const id = data?.id as string;
      boardgameIds.push(id);

      return id;
    }

    async function seedEndedGame(bgId: string, winnerIdx: number) {
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
        ids.map((player_id, i) => ({
          game_id: gameId,
          player_id,
          seat_order: i,
          is_winner: i === winnerIdx,
          score: 10 - i,
        })),
      );
    }

    const stamp = Date.now().toString(36);
    const kept = `Aaa-${stamp}`;
    const dropped = `Zzz-${stamp}`;
    const third = `Mmm-${stamp}`;

    // Player 0 wins the only party of the first game, and neither of the two
    // others — so the ranking says something different at every step.
    await seedEndedGame(await seedBoardgame(kept), 0);
    await seedEndedGame(await seedBoardgame(dropped), 1);
    await seedEndedGame(await seedBoardgame(third), 1);

    await page.goto("/stats");

    const p0Row = () =>
      page.getByRole("listitem").filter({ hasText: names[0] });
    const games = page.getByRole("button", {
      name: "Ouvrir la liste : Jeux pris en compte",
    });
    const emptyAll = page.getByRole("button", {
      name: "Tout décocher : Jeux pris en compte",
    });
    const fillAll = page.getByRole("button", {
      name: "Tout cocher : Jeux pris en compte",
    });

    // Every game counts to begin with.
    await expect(p0Row()).toBeVisible();

    await games.click();
    await page.getByRole("button", { name: dropped, exact: true }).click();
    await games.click();

    // Two games left of three: the box still names the one taken out, since
    // that is the shorter side. Player 0 won 1 of those 2 → 50%.
    await expect(page.getByText("Tous sauf")).toBeVisible();
    await expect(p0Row()).toContainText("50%");

    // Unticking the last games left is a legitimate state, and it says so
    // instead of quietly counting everything again.
    await emptyAll.click();

    await expect(page.getByText("Aucun jeu sélectionné")).toBeVisible();
    await expect(p0Row()).toHaveCount(0);

    // The same button, now turned round, puts every game back in one tap.
    await fillAll.click();

    await expect(page.getByText("Tous sauf")).toHaveCount(0);
    await expect(p0Row()).toBeVisible();

    // And the whole point: reaching a single game is two taps — empty, then
    // tick it — instead of unticking every other one. The box then names what
    // it keeps rather than the longer list of what it drops.
    await emptyAll.click();
    await games.click();
    await page.getByRole("button", { name: kept, exact: true }).click();
    await games.click();

    await expect(page.getByText("Seulement")).toBeVisible();
    await expect(p0Row()).toContainText("100%");
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }
    for (const id of boardgameIds) {
      await admin.from("boardgames").delete().eq("id", id);
    }
    await admin.from("players").delete().in("name", names);
  }
});

test("charts the score distribution for a scored game", async ({ page }) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = (seeded ?? []).map(p => p.id as string);

    async function seedScored(scores: number[]) {
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
        ids.map((player_id, i) => ({
          game_id: gameId,
          player_id,
          seat_order: i,
          is_winner: i === 0,
          score: scores[i],
        })),
      );
    }

    // Two scored Catan games → scores 3,5,6,8,10,10.
    await seedScored([10, 6, 3]);
    await seedScored([10, 8, 5]);

    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: "Catan", exact: true }).click();

    await expect(page.getByText("Répartition des scores")).toBeVisible();
    await expect(page.getByText(/6 scores · de 3 à 10/)).toBeVisible();

    // Toggle from the histogram to the dot plot.
    await page.getByRole("button", { name: "Nuage de points" }).click();
    await expect(
      page.getByRole("img", { name: "Nuage de points des scores" }),
    ).toBeVisible();
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }
    await admin.from("players").delete().in("name", names);
  }
});

/**
 * A simultaneous game (Splito, full-suite only — untagged): everyone plays at
 * once, so a round is one shared turn owned by nobody. No share of the time
 * belongs to a player, and the per-player figures that would divide it say so
 * by not being there — on the game's own tab and on a player's breakdown alike.
 */
test("drops the per-player time figures on a simultaneous game", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  let gameId = "";

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = (seeded ?? []).map(p => p.id as string);

    const { data: game } = await admin
      .from("games")
      .insert({
        boardgame_id: await boardgameId("Splito"),
        status: "ended",
        round: 2,
        turn: 2,
        ended_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    gameId = game?.id as string;

    await admin.from("game_players").insert(
      ids.map((player_id, i) => ({
        game_id: gameId,
        player_id,
        seat_order: i,
        is_winner: i === 0,
        score: 30 - i * 5,
      })),
    );

    // Two rounds, each a single turn the whole table played at once.
    await admin.from("game_turns").insert(
      [1, 2].map(round => ({
        game_id: gameId,
        player_id: null,
        round,
        turn_no: round,
        duration_s: 120,
      })),
    );

    await page.goto("/stats");

    // A player's breakdown: the Splito line stops at the score.
    await page
      .getByRole("listitem")
      .filter({ hasText: names[0] })
      .first()
      .click();

    const splitoLine = page.getByRole("listitem").filter({ hasText: "Splito" });

    await expect(splitoLine).toBeVisible();
    await expect(splitoLine).not.toContainText("Part du temps");

    // The game's own tab: same rule, and the explanation of an index nobody can
    // read here goes with it.
    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: "Splito", exact: true }).click();

    await expect(
      page.getByText("Statistiques des joueurs sur ce jeu"),
    ).toBeVisible();
    await expect(page.getByText("Part du temps")).toHaveCount(0);
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});

/**
 * A game counted manche by manche (Odin, full-suite only — untagged): it records
 * no turn at all, so the tab drops the time tiles it would fill with zeros and
 * reads the manches instead — how long a party runs, what a manche costs, and
 * who gets out of them.
 */
test("reads Odin's parties in manches rather than in time", async ({
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
    const odinId = await boardgameId("Odin");

    /** One ended party, its manches written down one row per player. */
    async function seedOdin(manches: number[][]) {
      const { data: game } = await admin
        .from("games")
        .insert({
          boardgame_id: odinId,
          status: "ended",
          round: 1,
          turn: 1,
          stage: manches.length,
          ended_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      const gameId = game?.id as string;
      gameIds.push(gameId);

      const totals = ids.map((_id, i) =>
        manches.reduce((sum, points) => sum + points[i], 0),
      );
      const best = Math.min(...totals);

      await admin.from("game_players").insert(
        ids.map((player_id, i) => ({
          game_id: gameId,
          player_id,
          seat_order: i,
          is_winner: totals[i] === best,
          score: totals[i],
        })),
      );
      await admin.from("game_stage_scores").insert(
        manches.flatMap((points, stage) =>
          ids.map((player_id, i) => ({
            game_id: gameId,
            stage: stage + 1,
            player_id,
            points: points[i],
          })),
        ),
      );
    }

    // Five manches over two parties, 39 points picked up in all.
    await seedOdin([
      [0, 4, 3],
      [5, 0, 2],
    ]);
    await seedOdin([
      [0, 2, 6],
      [3, 0, 1],
      [9, 4, 0],
    ]);

    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: "Odin", exact: true }).click();

    // Nothing timed, so nothing about time — the manches take those tiles.
    await expect(page.getByText("Temps de jeu moy.")).toHaveCount(0);
    await expect(page.getByText("Tour moy.")).toHaveCount(0);
    await expect(page.getByText("Manches moy.")).toBeVisible();
    await expect(page.getByText("2.5")).toBeVisible();
    await expect(page.getByText("Points / manche")).toBeVisible();
    await expect(page.getByText("7.8")).toBeVisible();

    // The two breakdowns only several parties can show.
    await expect(page.getByText("Qui sort le plus souvent")).toBeVisible();
    await expect(page.getByText("1 sortie sur 5 manches")).toBeVisible();
    await expect(page.getByText("Ce que coûte une manche")).toBeVisible();
    await expect(page.getByText(/15 manches de joueur/)).toBeVisible();
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }
    await admin.from("players").delete().in("name", names);
  }
});
