import { expect, test } from "@playwright/test";

import {
  adminClient,
  dropSeeded,
  playerIds,
  scoreTable,
  seedBoardgame,
  seedParty,
  seedPlayers,
  TABLE_SENSITIVE_SCORING,
} from "./utils/supabase";

/**
 * The « joueurs » half of the finished-game screen (full-suite only —
 * untagged): each player of the party read against **his own** past evenings on
 * the same game, and never against the table — the score sheet already ranks
 * that.
 */
test("places each player's evening among his own past evenings", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Recap ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    // Declared 2–3 and sensitive to the table, which is what puts the « à
    // nombre de joueurs égal » switch on the section.
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 2,
      maxPlayers: 3,
      roundLimit: 3,
      scoring: TABLE_SENSITIVE_SCORING,
    });

    const table = scoreTable(players, await playerIds(players));

    // Two evenings at three, one duel: the duel is in the history but not at
    // this table size, which is the whole point of the switch below.
    seeded.push(await seedParty(admin, bgId as string, table([40, 10, 20])));
    seeded.push(await seedParty(admin, bgId as string, table([60, 30, 5])));
    seeded.push(await seedParty(admin, bgId as string, table([20, 90])));

    const tonight = await seedParty(admin, bgId as string, table([50, 30, 10]));

    seeded.push(tonight);

    await page.goto(`/games/${tonight}/play`);

    // Nothing was timed and nothing was counted in manches, so the party's own
    // panel stays away — and the link down now exists for the other half.
    await expect(
      page.getByRole("heading", { name: "La partie", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Les joueurs", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Voir les statistiques ↓")).toBeVisible();

    // 50 tonight, against 40 / 60 / 20 before — second of the four evenings.
    const first = page.getByRole("listitem").filter({ hasText: players[0] });

    await expect(first).toContainText("3 parties avant ce soir");
    await expect(first).toContainText("50 pts");
    await expect(first).toContainText("2ᵉ sur 4");

    // The duel drops out at the same table size: 50 against 40 and 60 only.
    await page
      .getByRole("button", { name: "À nombre de joueurs égal", exact: true })
      .click();

    await expect(first).toContainText("2 parties avant ce soir");
    await expect(first).toContainText("2ᵉ sur 3");

    // The card carries the figures; the spread behind them is one tap away.
    await first.getByRole("button").click();

    const detail = page.getByRole("dialog");

    await expect(
      detail.getByRole("heading", { name: players[0], exact: true }),
    ).toBeVisible();
    await expect(detail).toContainText("À nombre de joueurs égal");
    await expect(detail).toContainText("Position");
    await expect(detail).toContainText("0 = premier, 100 = dernier.");

    await page.getByRole("button", { name: "Fermer" }).click();
    await expect(detail).toHaveCount(0);

    // The player who sat at every evening is read on his own scale, not on the
    // winner's: 30 tonight against 10, 30 and 90.
    const second = page.getByRole("listitem").filter({ hasText: players[1] });

    await expect(second).toContainText("30 pts");
  } finally {
    await dropSeeded(admin, {
      games: seeded,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
