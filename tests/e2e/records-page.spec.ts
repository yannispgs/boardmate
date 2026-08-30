import { expect, test } from "@playwright/test";

import {
  adminClient,
  dropSeeded,
  playerIds,
  seedBoardgame,
  seedParty,
  seedPlayers,
  seedTurns,
} from "./utils/supabase";

/**
 * The board of records of one game (full-suite only — untagged): what there is
 * to take, not only what has been taken. The page enumerates every basket a
 * mark can be set in — each set of extensions, and each table size on a game
 * whose scale moves with it — so a line nobody has played says « non attribué »
 * instead of quietly not existing.
 */
test("lists the marks standing on a game, and the baskets left to take", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Records ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    // Declared 2–3 and read at each table size: the record of a three-player
    // table never compares to a duel's, so the grid keeps them apart.
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 2,
      maxPlayers: 3,
      roundLimit: 3,
      scoring: {
        timing: "final",
        entry: "total",
        winCondition: { type: "highest" },
        playerCountSensitive: true,
      },
    });

    await admin
      .from("extensions")
      .insert({ base_game_id: bgId, name: "Extension E2E", sort_order: 1 });

    const idOf = await playerIds(players);
    const table = (scores: readonly number[]) => {
      return players.map((name, seat) => ({
        playerId: idOf(name),
        score: scores[seat],
        isWinner: scores[seat] === Math.max(...scores),
      }));
    };

    seeded.push(await seedParty(admin, bgId as string, table([90, 40, 10])));
    seeded.push(await seedParty(admin, bgId as string, table([70, 110, 20])));

    await page.goto("/boardgames");
    await page.getByRole("link", { name: gameName, exact: true }).click();
    await page.getByRole("link", { name: "Records", exact: true }).click();

    // The h1 is the layout's, so it says nothing about which tab is showing:
    // the URL is what proves the click landed. The line under it comes with the
    // grid, so it separates « the board errored or the game keeps no record »
    // from « the marks have not loaded yet » — three failures the missing row
    // below used to report as one.
    await expect(page).toHaveURL(/\/records$/);
    await expect(
      page.getByRole("heading", { name: gameName, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Touche une marque")).toBeVisible();

    // Both parties were played at three, so the duel line is up for grabs.
    // The grid names a table size on its left rail alone: « 2J », not
    // « 2 joueurs » — the words are kept for the detail, which has the room.
    const duel = page.getByRole("listitem").filter({ hasText: "2J" });

    await expect(duel).toContainText("Non attribué");

    const full = page.getByRole("listitem").filter({ hasText: "3J" });

    await expect(full).toContainText(players[1]);
    await expect(full).toContainText("110 points");

    // The grid names the holder; the detail says where everyone else stands —
    // and how contested the basket is, which the line no longer carries itself.
    await full.getByRole("button").click();
    await expect(
      page.getByRole("heading", { name: "Meilleurs scores" }),
    ).toBeVisible();
    await expect(
      page.getByText("Jeu de base · 3 joueurs · 2 parties"),
    ).toBeVisible();

    const ranked = page.getByRole("dialog").getByRole("listitem");

    await expect(ranked).toHaveCount(3);
    await expect(ranked.nth(0)).toContainText(players[1]);
    await expect(ranked.nth(0)).toContainText("110 pts");
    // His own best over the two parties, not his latest.
    await expect(ranked.nth(1)).toContainText(players[0]);
    await expect(ranked.nth(1)).toContainText("90 pts");
    await expect(ranked.nth(1)).toContainText("2 parties");

    await page.getByRole("button", { name: "Fermer" }).click();

    // A declared extension nobody has played is a basket of its own, empty.
    await page.getByRole("button", { name: "Extension E2E" }).click();
    await expect(page.getByText("Non attribué")).toHaveCount(2);
  } finally {
    if (bgId !== null) {
      await admin.from("extensions").delete().eq("base_game_id", bgId);
    }

    await dropSeeded(admin, {
      games: seeded,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});

/**
 * The same board on a game that is **raced**, where one table size holds
 * several marks: two races to different finish lines were never the same race,
 * so they take a mark each — under a single « 3J », not under one heading each.
 */
test("groups the marks of a table size under one heading", async ({ page }) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Courses ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 3,
      maxPlayers: 4,
      roundLimit: null,
      scoring: {
        timing: "live",
        entry: "total",
        // Catan's own shape: the scenario decides the total, so the score says
        // nothing and only the laps are worth keeping.
        trackRecords: false,
        stopCondition: { type: "scoreTarget", field: "pointsToWin" },
        winCondition: { type: "highest" },
        playerCountSensitive: true,
      },
    });

    const idOf = await playerIds(players);
    const race = async (scores: number[], rounds: number, target: number) => {
      const gameId = await seedParty(
        admin,
        bgId as string,
        players.map((name, seat) => ({
          playerId: idOf(name),
          score: scores[seat],
          isWinner: scores[seat] === Math.max(...scores),
        })),
        { round: rounds, configValues: { pointsToWin: target } },
      );

      await seedTurns(admin, gameId, [
        { playerId: idOf(players[0]), round: 1, turnNo: 1, durationS: 30 },
      ]);
      seeded.push(gameId);
    };

    // Played longest finish line first, so the rail can only come out climbing
    // if it sorts — not because that is the order they were filed in.
    await race([15, 9, 7], 9, 15);
    await race([10, 4, 3], 17, 10);

    await page.goto("/boardgames");
    await page.getByRole("link", { name: gameName, exact: true }).click();
    await page.getByRole("link", { name: "Records", exact: true }).click();
    await expect(page).toHaveURL(/\/records$/);
    await expect(page.getByText("Touche une marque")).toBeVisible();

    // One heading for the size, two marks hanging off it, each named by the
    // finish line it was set against rather than by repeating the size.
    const group = page.getByRole("listitem").filter({ hasText: "3J" });

    await expect(group).toHaveCount(1);

    const marks = group.getByRole("listitem");

    await expect(marks).toHaveCount(2);
    await expect(marks.nth(0)).toContainText("10P");
    await expect(marks.nth(0)).toContainText("17 tours");
    await expect(marks.nth(1)).toContainText("15P");
    await expect(marks.nth(1)).toContainText("9 tours");

    // The size nobody sat four at is still a basket, and still empty.
    await expect(
      page.getByRole("listitem").filter({ hasText: "4J" }),
    ).toContainText("Non attribué");

    // The abbreviations are for the rail; the detail spells the course out.
    await marks.nth(1).getByRole("button").click();
    await expect(
      page.getByText("Jeu de base · 3 joueurs · objectif 15 points · 1 partie"),
    ).toBeVisible();
  } finally {
    await dropSeeded(admin, {
      games: seeded,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
