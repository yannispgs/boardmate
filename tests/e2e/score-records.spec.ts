import { expect, test } from "@playwright/test";

import {
  adminClient,
  boardgameId,
  playerIds,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/**
 * The marks a party leaves in the books (full-suite only — untagged): « PB »
 * when a player beats his own best on the game, « WR » when he beats everyone's.
 *
 * Both are read off the parties already recorded, so both tests start by
 * putting some there. The second one is the interesting half: Papayoo shares
 * out the same 250 points whatever the table, so its records only count between
 * tables of the same size — and say which, « WR3 ».
 */

test("crowns a personal best and a game record on the reveal", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Record ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;
  let gameId: string | null = null;

  try {
    // Scored on a sheet the app totals itself, so the standings are announced
    // by the reveal — and the marks come out with the lines.
    bgId =
      (
        await admin
          .from("boardgames")
          .insert({
            name: gameName,
            min_players: 1,
            max_players: 4,
            round_limit: null,
            scoring: {
              timing: "final",
              entry: "categories",
              winCondition: { type: "highest" },
              sheet: [{ key: "points", label: "Points" }],
            },
          })
          .select("id")
          .single()
      ).data?.id ?? null;

    const idOf = await playerIds(players);

    // One party in the books: the bar to beat is 90, held by the second player.
    seeded.push(
      await seedParty(admin, bgId as string, [
        { playerId: idOf(players[0]), score: 30 },
        { playerId: idOf(players[1]), score: 90 },
        { playerId: idOf(players[2]), score: 20 },
      ]),
    );

    await page.goto("/games/new");
    await page.getByRole("button", { name: gameName, exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();
    for (const name of players) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Continuer →" }).click();
    await page.getByRole("button", { name: "Lancer la partie" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Lancer", exact: true })
      .click();

    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;

    // The first player goes past his own 30 and past everyone's 90; the other
    // two stay under their own best.
    await page.getByRole("button", { name: "Compter les points" }).click();
    await page.getByLabel(`Points — ${players[0]}`).fill("100");
    await page.getByLabel(`Points — ${players[1]}`).fill("40");
    await page.getByLabel(`Points — ${players[2]}`).fill("10");
    await page.getByRole("button", { name: "Total final" }).click();

    // A mark belongs to a line, so it waits for its line: the last place comes
    // out first and it holds none.
    await page.getByRole("button", { name: "Afficher" }).click();
    await expect(page.getByText(`3ᵉ place · ${players[2]}`)).toBeVisible();
    await expect(page.getByText("PB", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(page.getByText(`2ᵉ place · ${players[1]}`)).toBeVisible();
    await expect(page.getByText("PB", { exact: true })).toHaveCount(0);

    // The winner's line brings both marks with it, unsuffixed: this game's
    // scores compare between tables of any size.
    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(page.getByText("PB", { exact: true })).toBeVisible();
    await expect(page.getByText("WR", { exact: true })).toBeVisible();

    // The sheet the reveal hands over to keeps them, on the total that took
    // them — a mark must not flash past on the way to the next screen.
    await page.getByRole("button", { name: "Voir les scores" }).click();
    await expect(page.getByText("Feuille de scores")).toBeVisible();
    await expect(page.getByText("PB", { exact: true })).toBeVisible();
    await expect(page.getByText("WR", { exact: true })).toBeVisible();

    // And they are still there when the finished party is opened again later —
    // where the screen also says out loud that the game's record changed hands,
    // instead of leaving it to be discovered by opening the sheet.
    await page.goto(`/games/${gameId}/play`);
    await expect(page.getByText("⭐ Record du jeu battu !")).toBeVisible();
    await expect(page.getByText("100 pts — ancien record : 90")).toBeVisible();

    await page.getByRole("button", { name: "Voir le score final" }).click();
    await expect(page.getByText("PB", { exact: true })).toBeVisible();
    await expect(page.getByText("WR", { exact: true })).toBeVisible();

    // In the list, the mark goes to the party that *holds* the record — this
    // one — and not to the party of 90 it was just taken from.
    await page.goto("/games");
    const finished = page.locator("details", {
      has: page.getByText("Terminées"),
    });

    await finished.locator("summary").click();
    await expect(finished.getByText("⭐ WR", { exact: true })).toHaveCount(1);
    await expect(
      finished
        .locator(`a[href="/games/${gameId}/play"]`)
        .getByText("⭐ WR", { exact: true }),
    ).toBeVisible();
  } finally {
    for (const id of [...seeded, gameId]) {
      if (id) {
        await admin.from("games").delete().eq("id", id);
      }
    }
    if (bgId) {
      await admin.from("boardgames").delete().eq("id", bgId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("lifts the mark onto the sitting the record party is folded into", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Sitting ${Date.now().toString(36)}`;
  const sessionId = crypto.randomUUID();
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    bgId =
      (
        await admin
          .from("boardgames")
          .insert({
            name: gameName,
            min_players: 1,
            max_players: 4,
            round_limit: null,
            scoring: {
              timing: "final",
              entry: "total",
              winCondition: { type: "highest" },
            },
          })
          .select("id")
          .single()
      ).data?.id ?? null;

    const idOf = await playerIds(players);

    // Two deals of one evening, so the list folds them into a single row: the
    // first sets the bar at 90, the second takes it at 100.
    seeded.push(
      await seedParty(
        admin,
        bgId as string,
        [
          { playerId: idOf(players[0]), score: 30 },
          { playerId: idOf(players[1]), score: 90, isWinner: true },
          { playerId: idOf(players[2]), score: 20 },
        ],
        { sessionId },
      ),
    );
    seeded.push(
      await seedParty(
        admin,
        bgId as string,
        [
          { playerId: idOf(players[0]), score: 100, isWinner: true },
          { playerId: idOf(players[1]), score: 40 },
          { playerId: idOf(players[2]), score: 10 },
        ],
        { sessionId },
      ),
    );

    await page.goto("/games");
    const finished = page.locator("details", {
      has: page.getByText("Terminées"),
    });

    // The sitting is a `<details>` of its own inside the finished one, so the
    // disclosure of the section has to be picked as a direct child.
    await finished.locator("> summary").click();

    const sitting = finished.locator("details", {
      has: page.getByText("2 parties"),
    });

    // Folded, the row itself says the evening holds the game's record — the
    // whole point: a mark that has to be unfolded to be seen is a mark nobody
    // reads.
    await expect(
      sitting.locator("summary").getByText("⭐ WR", { exact: true }),
    ).toBeVisible();
    await expect(
      sitting
        .locator(`a[href="/games/${seeded[1]}/play"]`)
        .getByText("⭐ WR", { exact: true }),
    ).toBeHidden();

    // Unfolded, it belongs to the party that took it — not to the deal of 90 it
    // was taken from.
    await sitting.locator("summary").click();
    await expect(
      sitting
        .locator(`a[href="/games/${seeded[1]}/play"]`)
        .getByText("⭐ WR", { exact: true }),
    ).toBeVisible();
    await expect(
      sitting
        .locator(`a[href="/games/${seeded[0]}/play"]`)
        .getByText("⭐ WR", { exact: true }),
    ).toHaveCount(0);
  } finally {
    for (const id of seeded) {
      await admin.from("games").delete().eq("id", id);
    }
    if (bgId) {
      await admin.from("boardgames").delete().eq("id", bgId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

test("reads a Papayoo record against tables of the same size only", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(4);
  const seeded: string[] = [];
  let gameId: string | null = null;

  try {
    const bgId = await boardgameId("Papayoo");
    const idOf = await playerIds(players);

    // Three players: the smallest pile so far is 50.
    seeded.push(
      await seedParty(admin, bgId, [
        { playerId: idOf(players[0]), score: 100 },
        { playerId: idOf(players[1]), score: 100 },
        { playerId: idOf(players[2]), score: 50 },
      ]),
    );
    // Four players share the same 250 points, so everyone scores lower there.
    // Pooled in, that 5 would own the record for good and nothing below could
    // ever be marked again — which is exactly what must not happen.
    seeded.push(
      await seedParty(admin, bgId, [
        { playerId: idOf(players[0]), score: 5 },
        { playerId: idOf(players[1]), score: 80 },
        { playerId: idOf(players[2]), score: 80 },
        { playerId: idOf(players[3]), score: 85 },
      ]),
    );

    await page.goto("/games/new");
    await page.getByRole("button", { name: "Papayoo", exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();
    for (const name of players.slice(0, 3)) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Continuer →" }).click();
    await page.getByRole("button", { name: "Lancer la partie" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Lancer", exact: true })
      .click();

    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;

    // 20 beats his own 100 and the table's 50 — but not the 5 of the four-player
    // deal, which is why it must be left out of the comparison.
    await page.getByRole("button", { name: "Entrer les scores" }).click();
    await page.getByLabel(`Score de ${players[0]}`).fill("20");
    await page.getByLabel(`Score de ${players[1]}`).fill("110");
    await page.getByLabel(`Score de ${players[2]}`).fill("120");
    await page.getByRole("button", { name: "Terminer la session" }).click();

    // Totals typed by the table skip the reveal, so the marks are read on the
    // score kept with the party.
    await expect(page.getByText("Partie terminée")).toBeVisible();
    await page.getByRole("button", { name: "Voir le score final" }).click();

    // Both marks carry the table they are held at, and the bare ones never show.
    await expect(page.getByText("PB3", { exact: true })).toBeVisible();
    await expect(page.getByText("WR3", { exact: true })).toBeVisible();
    await expect(page.getByText("PB", { exact: true })).toHaveCount(0);
    await expect(page.getByText("WR", { exact: true })).toHaveCount(0);

    // The card of the party holding it carries the table size too: the list is
    // read across every size at once, so a bare « WR » would be a lie there.
    await page.goto("/games");
    const finished = page.locator("details", {
      has: page.getByText("Terminées"),
    });

    await finished.locator("summary").click();
    await expect(
      finished
        .locator(`a[href="/games/${gameId}/play"]`)
        .getByText("⭐ WR3", { exact: true }),
    ).toBeVisible();
  } finally {
    for (const id of [...seeded, gameId]) {
      if (id) {
        await admin.from("games").delete().eq("id", id);
      }
    }
    await admin.from("players").delete().in("name", players);
  }
});
