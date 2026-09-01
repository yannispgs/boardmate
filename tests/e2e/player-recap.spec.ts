import { expect, test } from "@playwright/test";

import {
  adminClient,
  dropSeeded,
  playerIds,
  scoreTable,
  seedBoardgame,
  seedParty,
  seedPlayers,
  seedTurns,
  TABLE_SENSITIVE_SCORING,
} from "./utils/supabase";

/**
 * The « joueurs » half of the finished-game screen (full-suite only —
 * untagged): each player of the party read against **his own** past parties on
 * the same game, and never against the table — the score sheet already ranks
 * that.
 */
test("places each player's party among his own past parties", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Recap ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    // Declared 2–3 and sensitive to the table, which is what puts the « à
    // nombre de joueurs égal » switch on the section. Untimed on purpose: the
    // column defaults to timed, and a timed game would grow the party panel
    // this scenario is built to do without.
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 2,
      maxPlayers: 3,
      roundLimit: 3,
      isTimed: false,
      scoring: TABLE_SENSITIVE_SCORING,
    });

    const table = scoreTable(players, await playerIds(players));

    // Two parties at three, one duel: the duel is in the history but not at
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
    await expect(page.getByText("Voir les statistiques ↓")).toBeVisible();

    // With one side of the recap empty there is nothing to switch between, so
    // the name goes back to being a plain heading and no tab bar is offered.
    await expect(
      page.getByRole("heading", { name: "Les joueurs", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Les joueurs", exact: true }),
    ).toHaveCount(0);

    // 50 tonight, against 40 / 60 / 20 before — second of his own four parties,
    // written as a plain rank because four is a number a reader can hold, and
    // the bar behind the figure spans exactly those four.
    const first = page.getByRole("listitem").filter({ hasText: players[0] });

    await expect(first).toContainText("3 parties avant celle-ci");
    await expect(first).toContainText("50 pts");
    await expect(first).toContainText("2ᵉ sur 4");
    await expect(
      first.getByRole("img", { name: /Score — 50 pts parmi ses 4 parties/ }),
    ).toBeVisible();

    // He led three of those four tables, so his position ties for the good end
    // — and a tie at an end still gets that end's word rather than a rank.
    await expect(first).toContainText("sa meilleure");

    // The duel drops out at the same table size: 50 against 40 and 60 only.
    // The narrow reading is a box you tick, so the wide one is what an
    // untouched screen shows — which is what the figures above just proved.
    await page
      .getByRole("checkbox", { name: "À nombre de joueurs égal", exact: true })
      .check();

    await expect(first).toContainText("2 parties avant celle-ci");
    await expect(
      first.getByRole("img", { name: /Score — 50 pts parmi ses 3 parties/ }),
    ).toBeVisible();

    // Without the duel he was first at all three tables: nothing separates the
    // positions any more, so neither end is his and the rank says it plainly.
    await expect(first).toContainText("1ʳᵉ sur 3");
    await expect(first).not.toContainText("sa meilleure");

    // « Position » is an index that runs down, which no bar can say on its own:
    // the sentence that used to live in the detail is on the figure itself.
    await first.getByRole("button", { name: "Position", exact: true }).click();

    await expect(page.getByTestId("info-bubble")).toContainText(
      "0 = premier, 100 = dernier.",
    );

    // The player who sat at every party is read on his own scale, not on the
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

/**
 * The same screen when the party has both things to say. Stacked, the two
 * readings made a page you scrolled twice over; they now sit behind two tabs,
 * one shown at a time, and the bar is the only place either is named.
 */
test("puts the party and the players behind two tabs", async ({ page }) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Onglets ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    // Timed this time (the column's default), which is what gives the party a
    // party panel next to the players' one.
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 2,
      maxPlayers: 3,
      roundLimit: 3,
      scoring: TABLE_SENSITIVE_SCORING,
    });

    const ids = await playerIds(players);
    const table = scoreTable(players, ids);

    // Two parties behind them: enough for this one to be placed among a past.
    seeded.push(await seedParty(admin, bgId as string, table([40, 10, 20])));
    seeded.push(await seedParty(admin, bgId as string, table([60, 30, 5])));

    const tonight = await seedParty(admin, bgId as string, table([50, 30, 10]));

    seeded.push(tonight);

    // One round actually played, so the party panel holds figures rather than
    // a row of zeros.
    await seedTurns(
      admin,
      tonight,
      players.map((name, seat) => ({
        playerId: ids(name),
        round: 1,
        turnNo: seat + 1,
        durationS: 30 + seat * 10,
      })),
    );

    await page.goto(`/games/${tonight}/play`);

    const partyTab = page.getByRole("button", {
      name: "La partie",
      exact: true,
    });
    const playersTab = page.getByRole("button", {
      name: "Les joueurs",
      exact: true,
    });

    await expect(partyTab).toBeVisible();
    await expect(playersTab).toBeVisible();

    // Named on the bar and nowhere else: a pill above a heading saying the same
    // thing is the duplication the tabs were meant to remove.
    await expect(
      page.getByRole("heading", { name: "La partie", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Les joueurs", exact: true }),
    ).toHaveCount(0);

    // The screen opens on the party itself; the careers are one tap away, not a scroll.
    await expect(page.getByText("Temps de jeu")).toBeVisible();
    await expect(
      page.getByText("Chacun face à ses propres parties sur ce jeu"),
    ).toHaveCount(0);

    await playersTab.click();

    await expect(
      page.getByText("Chacun face à ses propres parties sur ce jeu"),
    ).toBeVisible();
    await expect(page.getByText("Temps de jeu")).toHaveCount(0);

    // 50 tonight against 40 and 60 — the figures of the other test, reached
    // here through the tab rather than by scrolling past the party's.
    await expect(
      page.getByRole("listitem").filter({ hasText: players[0] }),
    ).toContainText("2ᵉ sur 3");

    // And back, which is the half of a tab bar a single click never proves.
    await partyTab.click();

    await expect(page.getByText("Temps de jeu")).toBeVisible();
  } finally {
    await dropSeeded(admin, {
      games: seeded,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
