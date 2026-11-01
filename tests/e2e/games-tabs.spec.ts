import { expect, test } from "@playwright/test";

import {
  adminClient,
  dropSeeded,
  playerIds,
  seedBoardgame,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/**
 * « Parties » in two tabs (full-suite only, untagged): the games on the table
 * and the history, the tab carried in the address so the home page can open
 * the history and the back button returns to it.
 */
test("splits the running games from the history, and keeps the tab", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const games: string[] = [];
  let bgId: string | null = null;
  const name = `E2E Onglets ${Date.now().toString(36)}`;

  try {
    bgId = await seedBoardgame(admin, { name, minPlayers: 2 });

    const idOf = await playerIds(players);
    const seats = players.map(player => ({
      playerId: idOf(player),
      score: null,
    }));

    games.push(await seedParty(admin, bgId, seats, { ongoing: true }));
    games.push(
      await seedParty(
        admin,
        bgId,
        players.map((player, i) => ({
          playerId: idOf(player),
          score: 10 - i,
          isWinner: i === 0,
        })),
      ),
    );
    const [running, finished] = games;

    // Something is on the table, so the screen opens on it — the history
    // waits on the other tab.
    await page.goto("/games");
    await expect(page.getByRole("radio", { name: /^En cours/ })).toBeChecked();
    await expect(
      page.locator(`a[href="/games/${running}/play"]`),
    ).toBeVisible();
    await expect(page.locator(`a[href="/games/${finished}/play"]`)).toHaveCount(
      0,
    );

    await page.getByText(/^Terminées ·/).click();
    await expect(page).toHaveURL(/\/games\?vue=terminees$/);
    await expect(page.locator(`a[href="/games/${running}/play"]`)).toHaveCount(
      0,
    );

    // Back from a finished game, the history is where the list picks up.
    await page.locator(`a[href="/games/${finished}/play"]`).click();
    await expect(page).toHaveURL(new RegExp(`/games/${finished}/play`));
    await page.goBack();
    await expect(page.getByRole("radio", { name: /^Terminées/ })).toBeChecked();

    // « Tout voir » on the home page opens the history directly.
    await page.goto("/");
    await page.getByRole("link", { name: "Tout voir" }).click();
    await expect(page).toHaveURL(/\/games\?vue=terminees$/);
    await expect(page.getByRole("radio", { name: /^Terminées/ })).toBeChecked();
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
