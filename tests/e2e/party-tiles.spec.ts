import { expect, type Locator, test } from "@playwright/test";

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

/** A full lap of the table, every seat taking the same time. */
function lap(
  ids: (name: string) => string,
  players: readonly string[],
  round: number,
  durationS: number,
) {
  return players.map((name, seat) => {
    return {
      playerId: ids(name),
      round,
      turnNo: (round - 1) * players.length + seat + 1,
      durationS,
    };
  });
}

/**
 * One tile of the grid, reached through its caption — the only thing on it that
 * is a fixed string. Scoping the figure to its own tile is what keeps « 1:00 »
 * from matching the curve's axis further down the panel.
 */
function tile(panel: Locator, label: string): Locator {
  return panel.getByText(label, { exact: true }).locator("..");
}

/**
 * The « La partie » tiles of the finished-game screen (full-suite only —
 * untagged): each table figure placed among the parties played before it on the
 * same game at the same table size, and the two figures that are dropped rather
 * than shown empty.
 */
test("places the party's figures among the parties before it", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Jauges ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    // Two laps and the game is over, which is what makes the lap count a
    // rulebook figure here rather than an evening's.
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 2,
      maxPlayers: 3,
      roundLimit: 2,
      scoring: TABLE_SENSITIVE_SCORING,
    });

    const ids = await playerIds(players);
    const table = scoreTable(players, ids);

    // The scale tonight is read on: a short party at 10 s a turn (60 s over the
    // table) and a long one at 30 s (180 s).
    const short = await seedParty(admin, bgId as string, table([40, 10, 20]));
    const long = await seedParty(admin, bgId as string, table([60, 30, 5]));

    seeded.push(short, long);

    await seedTurns(admin, short, [
      ...lap(ids, players, 1, 10),
      ...lap(ids, players, 2, 10),
    ]);
    await seedTurns(admin, long, [
      ...lap(ids, players, 1, 30),
      ...lap(ids, players, 2, 30),
    ]);

    // Tonight: 20 s a turn, 120 s over the table — halfway between the two.
    const tonight = await seedParty(admin, bgId as string, table([50, 30, 10]));

    seeded.push(tonight);

    await seedTurns(admin, tonight, [
      ...lap(ids, players, 1, 20),
      ...lap(ids, players, 2, 20),
    ]);

    await page.goto(`/games/${tonight}/play`);

    const panel = page.getByTestId("party-panel");

    await expect(tile(panel, "Temps de jeu")).toContainText("2:00");

    // The lap count says nothing here: the game stops at two laps and the party
    // played two. « Tours 2 » would be the rulebook printed on the recap.
    await expect(panel.getByText("Tours", { exact: true })).toHaveCount(0);

    // A lap took a minute, one player's go a third of it — and the two are told
    // apart by name, the second being the figure « Les joueurs » shows too.
    await expect(tile(panel, "Tour de table")).toContainText("1:00");
    await expect(tile(panel, "Tour moyen")).toContainText("0:20");

    // 120 s between 60 and 180: the bar is painted half way. Measured on the
    // boxes rather than on the inline style, since what the reader is given is
    // a length on the glass and the fill is a percentage of a parent.
    const fill = tile(panel, "Temps de jeu").getByTestId("gauge-fill");
    const fillBox = await fill.boundingBox();
    const trackBox = await fill.locator("..").boundingBox();

    expect(fillBox).not.toBeNull();
    expect(trackBox).not.toBeNull();

    const ratio = (fillBox?.width ?? 0) / (trackBox?.width ?? 1);

    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);

    // A party that stopped short of the limit is the one case where the count
    // is the only thing on the screen saying the game was abandoned — so it
    // comes back, on the very same game.
    const abandoned = await seedParty(admin, bgId as string, table([5, 4, 3]));

    seeded.push(abandoned);

    await seedTurns(admin, abandoned, lap(ids, players, 1, 20));

    await page.goto(`/games/${abandoned}/play`);

    const abandonedPanel = page.getByTestId("party-panel");

    await expect(
      abandonedPanel.getByText("Tours", { exact: true }),
    ).toBeVisible();

    // 60 s against 60, 120 and 180: the shortest evening ever played on this
    // game at three, and an empty bar is what says so.
    const emptyFill = tile(abandonedPanel, "Temps de jeu").getByTestId(
      "gauge-fill",
    );

    expect((await emptyFill.boundingBox())?.width ?? -1).toBe(0);
  } finally {
    await dropSeeded(admin, {
      games: seeded,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});

/**
 * The same tiles on a game the whole table plays at once (Splito's kind): the
 * mean player turn is dropped, since dividing the table's time by a number of
 * laps would answer a question nobody asked.
 */
test("drops the mean player turn when the table plays at once", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Simultané ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 2,
      maxPlayers: 4,
      roundLimit: null,
      turnMode: "simultaneous",
      scoring: TABLE_SENSITIVE_SCORING,
    });

    const ids = await playerIds(players);
    const table = scoreTable(players, ids);
    const tonight = await seedParty(admin, bgId as string, table([50, 30, 10]));

    seeded.push(tonight);

    // A simultaneous lap belongs to the table, not to a seat: its turns carry
    // no player at all.
    await seedTurns(admin, tonight, [
      { playerId: null, round: 1, turnNo: 1, durationS: 60 },
      { playerId: null, round: 2, turnNo: 2, durationS: 120 },
    ]);

    await page.goto(`/games/${tonight}/play`);

    const panel = page.getByTestId("party-panel");

    await expect(tile(panel, "Temps de jeu")).toContainText("3:00");
    await expect(tile(panel, "Tour de table")).toContainText("1:30");
    await expect(panel.getByText("Tour moyen", { exact: true })).toHaveCount(0);

    // No limit on this game, so the lap count is the evening's own figure.
    await expect(tile(panel, "Tours")).toContainText("2");
    await expect(tile(panel, "Tour le plus long")).toContainText("2:00");
  } finally {
    await dropSeeded(admin, {
      games: seeded,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
