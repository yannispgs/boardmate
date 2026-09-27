import { expect, type Locator, test } from "@playwright/test";

import {
  adminClient,
  playerIds,
  seedBoardgame,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/**
 * The position bar on a game's player list, the choice of ordering the list by
 * it, and the same bar on a player's own sheet (full-suite only — untagged).
 *
 * Three parties are seeded so the two orders disagree: the steady runner-up
 * never wins, so the win rate puts him last, while he finishes ahead of the
 * player who alternates between the crown and the bottom.
 */
test("orders a game's players by win rate or by position, and shows it on their sheet", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const [ace, swinger, steady] = names;
  const gameName = `Classement ${Date.now().toString(36)}`;
  const rareName = `Rare ${Date.now().toString(36)}`;
  const gameIds: string[] = [];
  const bgIds: string[] = [];
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
    bgIds.push(bgId);

    const idOf = await playerIds(names);

    async function seedFinish(order: string[], onGame = bgId as string) {
      gameIds.push(
        await seedParty(
          admin,
          onGame,
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

    const fillOf = (row: Locator) =>
      row.getByTestId("position-bar").locator("div").first();
    const rows = page
      .getByRole("listitem")
      .filter({ has: page.getByTestId("position-bar") });
    const order = async () => {
      const texts = await rows.allTextContents();

      return texts.map(text => names.find(name => text.includes(name)));
    };

    await expect(rows).toHaveCount(3);
    // The runner-up every time sits exactly mid-table: his bar stops on the
    // middle tick, and it is filled from the « dernier » end.
    await expect(fillOf(rows.filter({ hasText: steady }))).toHaveAttribute(
      "style",
      /width: 50%/,
    );

    // By win rate, the default: the runner-up who never wins comes last.
    expect(await order()).toEqual([ace, swinger, steady]);

    // By position, he climbs above the player who wins once and loses twice.
    await page.getByRole("button", { name: "Position moyenne" }).click();

    await expect(rows.first()).toContainText(ace);
    await expect(rows.nth(1)).toContainText(steady);
    await expect(rows.nth(2)).toContainText(swinger);

    // On his own sheet, the same bar under each game — but only from the third
    // ranked party: a second game played twice shows its win rate alone.
    const rare = await seedBoardgame(admin, {
      name: rareName,
      minPlayers: 2,
      scoring: {
        timing: "final",
        entry: "total",
        winCondition: { type: "highest" },
      },
    });
    bgIds.push(rare);

    await seedFinish([steady, ace, swinger], rare);
    await seedFinish([steady, ace, swinger], rare);

    await page.goto("/stats");
    await page.getByRole("button", { name: "Joueurs", exact: true }).click();
    await page.getByRole("button", { name: steady }).first().click();

    const ownRow = (name: string) =>
      page.getByRole("listitem").filter({ hasText: name });

    await expect(ownRow(gameName).getByTestId("position-bar")).toBeVisible();
    await expect(fillOf(ownRow(gameName))).toHaveAttribute(
      "style",
      /width: 50%/,
    );
    await expect(ownRow(rareName)).toBeVisible();
    await expect(ownRow(rareName).getByTestId("position-bar")).toHaveCount(0);
  } finally {
    for (const id of gameIds) {
      await admin.from("games").delete().eq("id", id);
    }

    if (bgIds.length > 0) {
      await admin.from("boardgames").delete().in("id", bgIds);
    }

    await admin.from("players").delete().in("name", names);
  }
});
