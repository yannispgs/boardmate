import { expect, test } from "@playwright/test";

import {
  adminClient,
  playerIds,
  seedBoardgame,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/**
 * The position bar on a game's player list, and the choice of ordering the list
 * by it (full-suite only — untagged).
 *
 * Three parties are seeded so the two orders disagree: the steady runner-up
 * never wins, so the win rate puts him last, while he finishes ahead of the
 * player who alternates between the crown and the bottom.
 */
test("orders a game's players by win rate or by position", async ({ page }) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const [ace, swinger, steady] = names;
  const gameName = `Classement ${Date.now().toString(36)}`;
  const gameIds: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 2,
      scoring: {
        timing: "final",
        entry: "total",
        winCondition: { type: "highest" },
      },
    });

    const idOf = await playerIds(names);

    async function seedFinish(order: string[]) {
      gameIds.push(
        await seedParty(
          admin,
          bgId as string,
          order.map((name, place) => ({
            playerId: idOf(name),
            score: 30 - place * 10,
            isWinner: place === 0,
          })),
        ),
      );
    }

    // ace 1st, 3rd, 1st → 67 % · position 33
    // swinger 3rd, 1st, 3rd → 33 % · position 67
    // steady 2nd every time → 0 % · position 50
    await seedFinish([ace, steady, swinger]);
    await seedFinish([swinger, steady, ace]);
    await seedFinish([ace, steady, swinger]);

    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: gameName, exact: true }).click();

    const rows = page
      .getByRole("listitem")
      .filter({ hasText: "Position moyenne · 0 = toujours 1er" });
    const order = async () => {
      const texts = await rows.allTextContents();

      return texts.map(text => names.find(name => text.includes(name)));
    };

    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: steady })).toContainText("50");

    // By win rate, the default: the runner-up who never wins comes last.
    expect(await order()).toEqual([ace, swinger, steady]);

    // By position, he climbs above the player who wins once and loses twice.
    await page.getByRole("button", { name: "Position moyenne" }).click();

    await expect(rows.first()).toContainText(ace);
    await expect(rows.nth(1)).toContainText(steady);
    await expect(rows.nth(2)).toContainText(swinger);
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }

    if (bgId !== null) {
      await admin.from("boardgames").delete().eq("id", bgId);
    }

    await admin.from("players").delete().in("name", names);
  }
});
