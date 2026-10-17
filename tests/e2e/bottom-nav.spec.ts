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
 * The tab bar and the home page built around it (full-suite only — untagged).
 *
 * The home page leads with the games still on the table and ends on the tools;
 * the bar sits under every screen but steps aside over a game being played,
 * whose « ← Parties » is the way back.
 */
test("picks a running game back up from home, and finds the way back", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    const name = `E2E Accueil ${Date.now().toString(36)}`;

    bgId = await seedBoardgame(admin, { name, minPlayers: 2 });

    const idOf = await playerIds(players);
    const party = await seedParty(
      admin,
      bgId,
      players.map(p => ({ playerId: idOf(p), score: null })),
      { ongoing: true, round: 3 },
    );

    games.push(party);

    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Navigation principale" });

    await expect(nav.getByRole("link", { name: "Accueil" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      page.getByRole("link", { name: "Roue de la chance" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Générer un plateau" }),
    ).toBeVisible();

    await page.getByRole("link", { name: `${name} · Tour 3` }).click();

    await expect(page).toHaveURL(new RegExp(`/games/${party}/play$`));
    await expect(nav).toHaveCount(0);

    await page.getByRole("link", { name: "← Parties" }).click();

    await expect(page).toHaveURL(/\/games$/);
    await expect(nav.getByRole("link", { name: "Parties" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});

test("opens the secondary sections from « Plus »", async ({ page }) => {
  await page.goto("/stats");

  await page.getByRole("button", { name: "Plus", exact: true }).click();
  await page.getByRole("link", { name: "Joueurs" }).click();

  await expect(page).toHaveURL(/\/players$/);
  await expect(page.getByRole("dialog", { name: "Plus" })).toHaveCount(0);
});
