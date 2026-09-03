import { expect, type Locator, test } from "@playwright/test";

import {
  adminClient,
  dropSeeded,
  playerIds,
  scoreTable,
  seedBoardgame,
  seedParty,
  seedPhases,
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
  pauseDurationS = 0,
) {
  return players.map((name, seat) => {
    return {
      playerId: ids(name),
      round,
      turnNo: (round - 1) * players.length + seat + 1,
      durationS,
      pauseDurationS,
    };
  });
}

/** What a scenario is handed once its game and its three players exist. */
interface SeededTable {
  admin: ReturnType<typeof adminClient>;
  players: string[];
  ids: (name: string) => string;
  /**
   * A finished party on that game, from a row of scores — highest takes it, and
   * fewer figures than players seats a smaller table. Registered for cleanup on
   * the way out, so a scenario never carries its own list. `stage` says how far
   * a game played in stages got, which the recap counts.
   */
  party: (
    scores: readonly number[],
    options?: Readonly<{ round?: number; stage?: number }>,
  ) => Promise<string>;
}

/**
 * Every scenario here reads the same panel on a game of its own, so each of them
 * needs a throwaway boardgame, three players, a handful of parties and the
 * teardown that undoes all of it. Only the barème and the assertions differ —
 * the rest was four copies of the same twenty lines.
 */
async function onSeededGame(
  label: string,
  boardgame: Omit<Parameters<typeof seedBoardgame>[1], "name">,
  scenario: (table: Readonly<SeededTable>) => Promise<void>,
): Promise<void> {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      ...boardgame,
      name: `E2E ${label} ${Date.now().toString(36)}`,
    });

    const ids = await playerIds(players);
    const table = scoreTable(players, ids);

    await scenario({
      admin,
      players,
      ids,
      party: async (scores, options) => {
        const id = await seedParty(
          admin,
          bgId as string,
          table(scores),
          options,
        );

        seeded.push(id);

        return id;
      },
    });
  } finally {
    await dropSeeded(admin, {
      games: seeded,
      boardgames: [bgId],
      playerNames: players,
    });
  }
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
 * How much of a tile's bar is painted, from 0 (empty) to 1 (full). Measured on
 * the boxes rather than on the inline style, since what the reader is given is
 * a length on the glass and the fill is a percentage of a parent.
 *
 * Handed back as a **function**, for `expect.poll` to call until it settles:
 * `boundingBox()` carries no timeout of its own — it reads whatever is on the
 * page at that instant — and a bar arrives one request behind the figure it
 * sits under, since placing a party needs the game's whole history first. A
 * plain read passes on a quiet machine and comes back null on a busy one.
 */
function fillRatio(stat: Locator): () => Promise<number | null> {
  return async () => {
    const fill = stat.getByTestId("gauge-fill");
    const fillBox = await fill.boundingBox();
    const trackBox = await fill.locator("..").boundingBox();

    return fillBox === null || trackBox === null
      ? null
      : fillBox.width / trackBox.width;
  };
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
  // Two laps and the game is over, which is what makes the lap count a rulebook
  // figure here rather than an evening's.
  await onSeededGame(
    "Jauges",
    {
      minPlayers: 2,
      maxPlayers: 3,
      roundLimit: 2,
      scoring: TABLE_SENSITIVE_SCORING,
    },
    async ({ admin, players, ids, party }) => {
      // The scale tonight is read on: a short party at 10 s a turn (60 s over
      // the table) and a long one at 30 s (180 s).
      const short = await party([40, 10, 20]);
      const long = await party([60, 30, 5]);

      await seedTurns(admin, short, [
        ...lap(ids, players, 1, 10),
        ...lap(ids, players, 2, 10),
      ]);
      await seedTurns(admin, long, [
        ...lap(ids, players, 1, 30),
        ...lap(ids, players, 2, 30),
      ]);

      // Tonight: 20 s a turn, 120 s over the table — halfway between the two.
      const tonight = await party([50, 30, 10]);

      await seedTurns(admin, tonight, [
        ...lap(ids, players, 1, 20),
        ...lap(ids, players, 2, 20),
      ]);

      await page.goto(`/games/${tonight}/play`);

      const panel = page.getByTestId("party-panel");

      await expect(tile(panel, "Temps de jeu")).toContainText("2:00");

      // The lap count says nothing on a game that runs to a fixed number of
      // laps: « Tours 2 » would be the rulebook printed on the recap.
      await expect(panel.getByText("Tours", { exact: true })).toHaveCount(0);

      // A lap took a minute, one player's go a third of it — and the two are
      // told apart by name, the second being the figure « Les joueurs » shows.
      await expect(tile(panel, "Tour de table")).toContainText("1:00");
      await expect(tile(panel, "Tour moyen")).toContainText("0:20");

      // The table never stopped, so the pause-included time would be the played
      // one written out a second time.
      await expect(panel.getByText("Temps total", { exact: true })).toHaveCount(
        0,
      );

      // 120 s between 60 and 180: the bar is painted half way.
      await expect
        .poll(fillRatio(tile(panel, "Temps de jeu")))
        .toBeCloseTo(0.5, 1);

      // And a party whose log stops short of the limit keeps it hidden. This is
      // the ordinary case rather than the odd one: the log closes on the lap the
      // table was playing when the game ended, so the count read off it is one
      // short on nearly every party of such a game.
      const short2 = await party([5, 4, 3]);

      await seedTurns(admin, short2, lap(ids, players, 1, 20));

      await page.goto(`/games/${short2}/play`);

      const shortPanel = page.getByTestId("party-panel");

      await expect(tile(shortPanel, "Temps de jeu")).toContainText("1:00");
      await expect(shortPanel.getByText("Tours", { exact: true })).toHaveCount(
        0,
      );

      // 60 s against 60, 120 and 180: the shortest evening ever played on this
      // game at three, and an empty bar is what says so.
      await expect.poll(fillRatio(tile(shortPanel, "Temps de jeu"))).toBe(0);
    },
  );
});

/**
 * The basket, on a game whose scale does **not** move with the table: every
 * party of the game counts, whatever the seat count — and one party before is
 * enough for a bar, which is the commonest history there is.
 */
test("reads a party against every table size when the game allows it", async ({
  page,
}) => {
  // A plain total, highest takes it — and no `playerCountSensitive`, which is
  // what widens the basket.
  await onSeededGame(
    "Panier",
    {
      minPlayers: 2,
      maxPlayers: 4,
      roundLimit: null,
      scoring: {
        timing: "final",
        entry: "total",
        winCondition: { type: "highest" },
      },
    },
    async ({ admin, players, ids, party }) => {
      // The only party before, and it was played at three.
      const past = await party([40, 10, 20]);

      await seedTurns(admin, past, lap(ids, players, 1, 10));

      // Tonight, at two — a table size never played on this game.
      const duel = players.slice(0, 2);
      const tonight = await party([50, 30]);

      await seedTurns(admin, tonight, lap(ids, duel, 1, 40));

      await page.goto(`/games/${tonight}/play`);

      const panel = page.getByTestId("party-panel");

      await expect(tile(panel, "Temps de jeu")).toContainText("1:20");

      // 80 s against the 30 s of a party played at another table size: the bar
      // exists at all, and it is full — the longest evening on this game.
      await expect.poll(fillRatio(tile(panel, "Temps de jeu"))).toBe(1);

      // And the tip says which parties were counted, the bars carrying no text.
      await tile(panel, "Temps de jeu")
        .getByRole("button", { name: "Temps de jeu" })
        .click();

      await expect(page.getByTestId("info-bubble")).toContainText(
        "quel que soit le nombre de joueurs",
      );
    },
  );
});

/**
 * The evening's other length: what the party lasted rather than what it was
 * played, which only exists — and is only shown — once the table has stopped.
 */
test("adds the pause-included time to a party that stopped", async ({
  page,
}) => {
  await onSeededGame(
    "Pauses",
    {
      minPlayers: 2,
      maxPlayers: 4,
      roundLimit: null,
      scoring: TABLE_SENSITIVE_SCORING,
    },
    async ({ admin, players, ids, party }) => {
      const tonight = await party([50, 30, 10]);

      // A lap of 20 s a seat, each stopped for 10 s: 60 s played, 30 s waited.
      await seedTurns(admin, tonight, lap(ids, players, 1, 20, 10));

      await page.goto(`/games/${tonight}/play`);

      const panel = page.getByTestId("party-panel");

      await expect(tile(panel, "Temps de jeu")).toContainText("1:00");
      await expect(tile(panel, "Temps en pause")).toContainText("0:30");

      // The two added up — the time the table was actually sat down.
      await expect(tile(panel, "Temps total")).toContainText("1:30");
    },
  );
});

/** Terraforming Mars's shape: generations, played in three phases. */
const STAGED_GAME = {
  minPlayers: 2,
  maxPlayers: 4,
  roundLimit: null,
  scoring: TABLE_SENSITIVE_SCORING,
  stages: { label: "Génération", advance: "pass" },
  phases: [
    {
      key: "discovery",
      label: "Découverte",
      mode: "simultaneous",
      clock: "stopwatch",
    },
    {
      key: "projects",
      label: "Projets",
      mode: "sequential",
      clock: "turnTimer",
    },
    {
      key: "production",
      label: "Production",
      mode: "simultaneous",
      clock: "stopwatch",
    },
  ],
} as const;

/** One generation of that game, timed phase by phase. */
function generation(stage: number, discoveryS: number) {
  return [
    { stage, phaseKey: "discovery", durationS: discoveryS },
    // The envelope of the turns below, never added to what they already say.
    { stage, phaseKey: "projects", durationS: 60 },
    { stage, phaseKey: "production", durationS: 15 },
  ];
}

/**
 * The recap of a game played in generations and in phases: it counts what the
 * table counts, its played time is the whole evening rather than the third of it
 * the turn log sees, and the two turn averages say which phase they price.
 */
test("reads a party in the words of a game played in phases", async ({
  page,
}) => {
  await onSeededGame(
    "Générations",
    STAGED_GAME,
    async ({ admin, players, ids, party }) => {
      // The one party before: a single generation, longer on the discovery.
      const past = await party([40, 10, 20], { round: 1, stage: 1 });

      await seedTurns(admin, past, lap(ids, players, 1, 20));
      await seedPhases(admin, past, generation(1, 60));

      // Tonight: two generations, 20 s a turn — 120 s of turns, and 105 s of the
      // phases the log never saw (30 + 45 of discovery, 15 + 15 of production).
      const tonight = await party([50, 30, 10], { round: 2, stage: 2 });

      await seedTurns(admin, tonight, [
        ...lap(ids, players, 1, 20),
        ...lap(ids, players, 2, 20),
      ]);
      await seedPhases(admin, tonight, [
        ...generation(1, 30),
        ...generation(2, 45),
      ]);

      await page.goto(`/games/${tonight}/play`);

      const panel = page.getByTestId("party-panel");

      // The count is the table's own word, and « Tours » is nowhere on the recap.
      await expect(tile(panel, "Générations")).toContainText("2");
      await expect(panel.getByText("Tours", { exact: true })).toHaveCount(0);

      // 120 s of turns plus 105 s of discovery and production: the evening, not
      // the phase the turns were taken in.
      await expect(tile(panel, "Temps de jeu")).toContainText("3:45");

      // The two averages, on the other hand, come off the turn log alone — so
      // they name the phase they price rather than pass for the whole generation.
      await expect(tile(panel, "Tour de table — Projets")).toContainText(
        "1:00",
      );
      await expect(tile(panel, "Tour moyen — Projets")).toContainText("0:20");

      // And the tile says so in words too.
      await tile(panel, "Tour moyen — Projets")
        .getByRole("button", { name: "Tour moyen — Projets" })
        .click();

      await expect(page.getByTestId("info-bubble")).toContainText(
        "Ne concerne que la phase Projets",
      );

      // Down in « Temps par phase », each phase carries its own bar: 75 s of
      // discovery against the 60 s of the only party before — the longest the
      // table has ever spent finding out what it was going to play.
      const legend = page
        .getByTestId("stat-group")
        .filter({ hasText: "Temps par phase" })
        .locator("li")
        .filter({ hasText: "Découverte" });

      await expect(legend).toContainText("1:15");
      await expect.poll(fillRatio(legend)).toBe(1);
    },
  );
});

/**
 * The same tiles on a game the whole table plays at once (Splito's kind): the
 * mean player turn is dropped, since dividing the table's time by a number of
 * laps would answer a question nobody asked.
 */
test("drops the mean player turn when the table plays at once", async ({
  page,
}) => {
  await onSeededGame(
    "Simultané",
    {
      minPlayers: 2,
      maxPlayers: 4,
      roundLimit: null,
      turnMode: "simultaneous",
      scoring: TABLE_SENSITIVE_SCORING,
    },
    async ({ admin, party }) => {
      const tonight = await party([50, 30, 10]);

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
      await expect(panel.getByText("Tour moyen", { exact: true })).toHaveCount(
        0,
      );

      // No limit on this game, so the lap count is the evening's own figure.
      await expect(tile(panel, "Tours")).toContainText("2");
      await expect(tile(panel, "Tour le plus long")).toContainText("2:00");
    },
  );
});
