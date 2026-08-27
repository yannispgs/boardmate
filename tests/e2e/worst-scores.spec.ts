import { expect, test } from "@playwright/test";

import {
  adminClient,
  boardgameId,
  playerIds,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/**
 * The hall of shame on a player's sheet (full-suite only — untagged).
 *
 * It used to print one block per game and one card per table size, so a player
 * who plays both games Boardmate reads this way ended up scrolling past four
 * lists to reach one. Both cuts are now asked as controls: which game, in a
 * menu beside the title, and which table, in a row of sizes underneath.
 *
 * The test seeds the two games won by scoring little — Papayoo at two different
 * table sizes, Odin at one — and drives both controls, because neither the
 * screen nor the selection is measured by the coverage run: `src/app/**` is out
 * of its scope by design.
 */
test("picks the game and the table the worst scores are read on", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(4);
  const idOf = await playerIds(players);
  const seeded: string[] = [];

  try {
    const papayoo = await boardgameId("Papayoo");
    const odin = await boardgameId("Odin");

    // Papayoo at three: our man collects the whole pile once. The 250 points of
    // a deal are shared out, so this total only ever compares at this table.
    seeded.push(
      await seedParty(admin, papayoo, [
        { playerId: idOf(players[0]), score: 250 },
        { playerId: idOf(players[1]), score: 0 },
        { playerId: idOf(players[2]), score: 0 },
      ]),
    );

    // Papayoo at four: a quieter evening for him, and a lighter worst total.
    seeded.push(
      await seedParty(admin, papayoo, [
        { playerId: idOf(players[0]), score: 60 },
        { playerId: idOf(players[1]), score: 90 },
        { playerId: idOf(players[2]), score: 50 },
        { playerId: idOf(players[3]), score: 50 },
      ]),
    );

    // Odin, played once. Nothing is pooled here, but the small score still
    // wins — so the game belongs in the menu.
    seeded.push(
      await seedParty(admin, odin, [
        { playerId: idOf(players[0]), score: 31 },
        { playerId: idOf(players[1]), score: 12 },
        { playerId: idOf(players[2]), score: 20 },
      ]),
    );

    await page.goto("/stats");
    await page.getByRole("button", { name: "Joueurs", exact: true }).click();
    await page.getByRole("button", { name: players[0] }).first().click();

    // Two games to read this way → the title stops naming one, the menu does.
    const menu = page.getByLabel("Jeu des pires scores");

    await expect(menu).toBeVisible();
    await expect(page.getByText("Pires scores", { exact: true })).toBeVisible();

    const list = page.getByTestId("worst-scores");

    // The section opens on whichever game comes first in the catalogue, so ask
    // for the one played at two tables rather than assume it is already up.
    await menu.selectOption({ label: "Papayoo" });

    const three = page.getByRole("button", { name: "3 joueurs" });
    const four = page.getByRole("button", { name: "4 joueurs" });

    await expect(three).toBeVisible();
    await expect(four).toBeVisible();

    // The two tables tell two different stories, and only one is on screen.
    await three.click();
    await expect(list).toContainText("250");
    await expect(list).not.toContainText("60");

    await four.click();
    await expect(list).toContainText("60");
    await expect(list).not.toContainText("250");

    // Odin was played at one table only: the size is still stated, since it is
    // what makes two totals comparable — but as a label, not a choice of one.
    await menu.selectOption({ label: "Odin" });

    await expect(list).toContainText("31");
    await expect(page.getByText("À 3 joueurs")).toBeVisible();
    await expect(page.getByRole("button", { name: "3 joueurs" })).toHaveCount(
      0,
    );

    // Odin pools no points, so « finir à 0 » says nothing there: no line under
    // the list, whichever way the game was played.
    await expect(page.getByText(/partie.? à 0 sur/)).toHaveCount(0);
  } finally {
    for (const id of seeded) {
      await admin.from("games").delete().eq("id", id);
    }
    await admin.from("players").delete().in("name", players);
  }
});
