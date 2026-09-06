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
    // The narrow reading is a switch you flick, so the wide one is what an
    // untouched screen shows — which is what the figures above just proved.
    await page
      .getByRole("switch", { name: "À nombre de joueurs égal", exact: true })
      .click();

    await expect(first).toContainText("2 parties avant celle-ci");
    await expect(
      first.getByRole("img", { name: /Score — 50 pts parmi ses 3 parties/ }),
    ).toBeVisible();

    // Without the duel he was first at all three tables: nothing separates the
    // positions any more, so neither end is his and the rank says it plainly.
    await expect(first).toContainText("1ʳᵉ sur 3");
    await expect(first).not.toContainText("sa meilleure");

    // Both readings stay written either way; the bold one is the one the
    // figures are counted on, which is what makes the scale readable without
    // touching anything. Asserted on the weight rather than the class, since
    // the weight is what a reader actually sees.
    const wide = page.getByRole("button", {
      name: "Toutes les parties",
      exact: true,
    });
    const narrow = page.getByRole("button", {
      name: "À nombre de joueurs égal",
      exact: true,
    });

    await expect(narrow).toHaveCSS("font-weight", "600");
    await expect(wide).not.toHaveCSS("font-weight", "600");

    // And a name is its own target: clicking « Toutes les parties » means that,
    // never « inverse ce qui est coché ».
    await wide.click();

    await expect(first).toContainText("3 parties avant celle-ci");
    await expect(wide).toHaveCSS("font-weight", "600");

    // The score handle is pinned to the right edge for the whole screen, and
    // the end of a player's line is where the figure and « sa meilleure » are:
    // the block has to stop short of it rather than run underneath. Asserted on
    // the boxes, since the overlap is a geometry fact no text assertion sees —
    // a covered line still matches `toContainText`.
    const handle = page.getByRole("button", { name: "Voir le score final" });
    const handleBox = await handle.boundingBox();
    const rowBox = await first.boundingBox();

    expect(handleBox).not.toBeNull();
    expect(rowBox).not.toBeNull();

    expect((rowBox?.x ?? 0) + (rowBox?.width ?? 0)).toBeLessThanOrEqual(
      handleBox?.x ?? 0,
    );

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

    // A standing is said and painted: the top fifth of his own parties in one
    // colour, the bottom fifth in another, the middle in the text colour. He
    // led three of his four tables (« sa meilleure ») and finished 2ᵉ sur 4 on
    // the score, and the third player never got off the bottom (« sa pire »).
    // Asserted as three colours that differ, not as three hex values: the
    // palette has a light reading and a dark one, and the fact under test is
    // that the three are told apart.
    const third = page.getByRole("listitem").filter({ hasText: players[2] });
    const good = await first.getByText("sa meilleure").evaluate(node => {
      return getComputedStyle(node).color;
    });
    const plain = await first.getByText("sur 4").evaluate(node => {
      return getComputedStyle(node).color;
    });
    const bad = await third.getByText("sa pire").evaluate(node => {
      return getComputedStyle(node).color;
    });

    expect(new Set([good, plain, bad]).size).toBe(3);
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
  const players = await seedPlayers(4);
  const gameName = `E2E Onglets ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    // Timed this time (the column's default), which is what gives the party a
    // party panel next to the players' one.
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 2,
      maxPlayers: 4,
      roundLimit: 3,
      scoring: TABLE_SENSITIVE_SCORING,
    });

    const ids = await playerIds(players);
    const table = scoreTable(players, ids);

    // Two parties behind them: enough for this one to be placed among a past.
    seeded.push(
      await seedParty(admin, bgId as string, table([40, 10, 20, 15])),
    );
    seeded.push(await seedParty(admin, bgId as string, table([60, 30, 5, 25])));

    // The two first seats finish level on 50 and the game's tie-break crowns
    // the second — Splito's shape. The order the rows come out in is therefore
    // neither the seating order nor the one the totals alone would give: read on
    // the points, the first two seats would both be first and both wear gold.
    const tonight = await seedParty(
      admin,
      bgId as string,
      players.map((name, seat) => ({
        playerId: ids(name),
        score: [50, 50, 10, 5][seat],
        isWinner: seat === 1,
      })),
    );

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

    // The screen opens on the party itself; the careers are one tap away
    // rather than a scroll.
    await expect(page.getByText("Temps de jeu")).toBeVisible();
    await expect(
      page.getByText("Chacun face à ses propres parties sur ce jeu"),
    ).toHaveCount(0);

    await playersTab.click();

    await expect(
      page.getByText("Chacun face à ses propres parties sur ce jeu"),
    ).toBeVisible();
    await expect(page.getByText("Temps de jeu")).toHaveCount(0);

    // The evening is told in the order it finished in, not in the order the
    // sheet was filled: the second seat won the tie-break, so he opens the list
    // and the player he beat on the same 50 points comes next.
    const rows = page.getByTestId("player-recaps").getByRole("listitem");

    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText(players[1]);
    await expect(rows.nth(1)).toContainText(players[0]);
    await expect(rows.nth(2)).toContainText(players[2]);
    await expect(rows.nth(3)).toContainText(players[3]);

    // The podium is worn on the whole block — the name grows, and the metal is
    // washed under the player's lines rather than behind his name alone. The
    // second row is what the tie-break buys: on the totals alone it would be a
    // second gold.
    await expect(rows.nth(0).getByText(players[1])).toHaveCSS(
      "font-size",
      "20px",
    );
    await expect(rows.nth(1).getByText(players[0])).toHaveCSS(
      "font-size",
      "18px",
    );
    await expect(rows.nth(2).getByText(players[2])).toHaveCSS(
      "font-size",
      "16px",
    );

    // And the four backgrounds are four different colours: three metals and the
    // plain panel a player off the podium sits on. Asserted as « they differ »
    // rather than as four values, since the wash is an alpha over whatever the
    // screen is painted — the fact under test is that a reader tells them
    // apart, not which hex the compositor lands on.
    const washes = await rows.evaluateAll(nodes => {
      return nodes.map(node => {
        return getComputedStyle(node).backgroundColor;
      });
    });

    expect(new Set(washes).size).toBe(4);

    // 50 tonight against 10 and 30 — the figures of a career, reached here
    // through the tab rather than by scrolling past the party's.
    await expect(rows.nth(0)).toContainText("50 pts");

    // And back, which is the half of a tab bar a single click never proves.
    await partyTab.click();

    await expect(page.getByText("Temps de jeu")).toBeVisible();

    // The score handle covers this panel exactly as it covered the rows, and
    // this one is charts and tiles that all run to the right edge — the end of
    // a curve is where the party finished. Same geometry assertion, since the
    // overlap is a fact no text assertion can see.
    const handle = page.getByRole("button", { name: "Voir le score final" });
    const handleBox = await handle.boundingBox();
    const panelBox = await page.getByTestId("party-panel").boundingBox();

    expect(handleBox).not.toBeNull();
    expect(panelBox).not.toBeNull();

    expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0)).toBeLessThanOrEqual(
      handleBox?.x ?? 0,
    );
  } finally {
    await dropSeeded(admin, {
      games: seeded,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
