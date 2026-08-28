import { expect, test } from "@playwright/test";

import {
  adminClient,
  playerIds,
  seedParty,
  seedPlayers,
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
    bgId =
      (
        await admin
          .from("boardgames")
          .insert({
            name: gameName,
            min_players: 2,
            max_players: 3,
            round_limit: 3,
            scoring: {
              timing: "final",
              entry: "total",
              winCondition: { type: "highest" },
              playerCountSensitive: true,
            },
          })
          .select("id")
          .single()
      ).data?.id ?? null;

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
    await page.getByRole("link", { name: `Records de ${gameName}` }).click();

    await expect(
      page.getByRole("heading", { name: `Records — ${gameName}` }),
    ).toBeVisible();

    // Both parties were played at three, so the duel line is up for grabs.
    const duel = page.getByRole("listitem").filter({ hasText: "2 joueurs" });

    await expect(duel).toContainText("0 partie");
    await expect(duel).toContainText("Non attribué");

    const full = page.getByRole("listitem").filter({ hasText: "3 joueurs" });

    await expect(full).toContainText("2 parties");
    await expect(full).toContainText(players[1]);
    await expect(full).toContainText("110 points");

    // The grid names the holder; the detail says where everyone else stands.
    await full.getByRole("button").click();
    await expect(
      page.getByRole("heading", { name: "Meilleurs scores" }),
    ).toBeVisible();
    await expect(page.getByText("Jeu de base · 3 joueurs")).toBeVisible();

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
    for (const id of seeded) {
      await admin.from("games").delete().eq("id", id);
    }

    if (bgId) {
      await admin.from("extensions").delete().eq("base_game_id", bgId);
      await admin.from("boardgames").delete().eq("id", bgId);
    }

    await admin.from("players").delete().in("name", players);
  }
});
