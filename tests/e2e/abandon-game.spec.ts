import { expect, test } from "@playwright/test";

import { funnelToPlay } from "./utils/funnel";
import {
  adminClient,
  playerIds,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/**
 * Abandoning an ongoing game from the games list: it permanently deletes the
 * game (no score kept). Finished games get no such control. Full-suite only.
 */
test("abandons an ongoing game from the list", async ({ page }) => {
  const players = await seedPlayers(3);
  let gameId = "";

  try {
    gameId = await funnelToPlay(page, players);

    await page.goto("/games");
    // The ongoing game is listed with its current player.
    const card = page
      .locator("li")
      .filter({ hasText: `Au tour de ${players[0]}` });
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: /Abandonner la partie/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // A party played on its own takes its whole evening with it, so there is no
    // sitting to be shut out of and nothing to warn about.
    await expect(dialog.getByText(/clôturera la session/)).toHaveCount(0);

    await dialog.getByRole("button", { name: "Abandonner" }).click();

    // The game is gone from the list.
    await expect(page.getByText(`Au tour de ${players[0]}`)).toHaveCount(0);
    gameId = "";
  } finally {
    const admin = adminClient();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

/**
 * The warning the retour asked for (full-suite only — untagged): abandoning the
 * last deal still running on an evening shuts that evening for good, since a
 * sitting is only ever continued from the party on the table. Said in amber
 * before the press, because nothing else on the screen hints at it.
 */
test("warns that abandoning the last running deal seals the evening", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Clôture ${Date.now().toString(36)}`;
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
    const deal = (ongoing: boolean) => {
      return seedParty(
        admin,
        bgId as string,
        players.map(name => ({ playerId: idOf(name), score: 10 })),
        { sessionId, ongoing },
      );
    };

    // Two deals over, the third on the table — the evening the warning is for.
    seeded.push(await deal(false));
    seeded.push(await deal(false));
    seeded.push(await deal(true));

    await page.goto("/games");
    // The evening reaches the list folded into one row; the deal on the table
    // is inside it.
    await page.locator("summary").filter({ hasText: gameName }).click();

    // The only deal on the table in this run, so the only abandon control.
    await page.getByRole("button", { name: /Abandonner la partie/ }).click();

    const warning = page.getByRole("dialog").getByText(/clôturera la session/);
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(
      "Les 2 parties déjà terminées restent dans l'historique.",
    );
    // Orange, because it is a warning and not a second sentence of explanation.
    await expect(warning).toHaveClass(/text-amber-600/);
  } finally {
    await admin.from("games").delete().in("id", seeded);

    if (bgId !== null) {
      await admin.from("boardgames").delete().eq("id", bgId);
    }

    await admin.from("players").delete().in("name", players);
  }
});
