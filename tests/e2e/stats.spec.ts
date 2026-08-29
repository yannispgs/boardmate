import { expect, test } from "@playwright/test";

import {
  adminClient,
  boardgameId,
  CATAN_ID,
  dropSeeded,
  playerIds,
  seedBoardgame,
  seedParty,
  seedPlayers,
  seedTurns,
  TERRAFORMING_MARS_NAME,
} from "./utils/supabase";

/**
 * The global statistics page (full-suite only — untagged): averages of every
 * finished game, with the boardgame / player filters narrowing the set. Seeds a
 * couple of ended games directly (service role) so the aggregation has data.
 */
test("shows player averages and per-game averages across the two tabs", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];
  let otherBoardgameId: string | null = null;

  try {
    const idOf = await playerIds(names);
    const ids = names.map(idOf);

    otherBoardgameId = await seedBoardgame(admin, {
      name: `Zzz-${Date.now().toString(36)}`,
    });

    async function seedEndedGame(bgId: string, winnerIdx: number) {
      const gameId = await seedParty(
        admin,
        bgId,
        ids.map((playerId, i) => ({
          playerId,
          score: 10 - i,
          isWinner: i === winnerIdx,
        })),
      );

      gameIds.push(gameId);

      // Each player takes a longer turn than the one before, so the time index
      // ranks them in a known order.
      await seedTurns(
        admin,
        gameId,
        ids.map((playerId, i) => ({
          playerId,
          round: 1,
          turnNo: i + 1,
          durationS: 30 + i * 10,
        })),
      );
    }

    // Two Catan games (player 0 wins both) + one on the other boardgame.
    await seedEndedGame(CATAN_ID, 0);
    await seedEndedGame(CATAN_ID, 0);
    await seedEndedGame(otherBoardgameId, 1);

    await page.goto("/stats");

    // Joueurs tab (default): across all 3 games player 0 won 2 → 67%, on top.
    await expect(page.getByText("Classement des joueurs")).toBeVisible();

    const cards = page.getByRole("listitem");

    await expect(cards.first()).toContainText(names[0]);
    await expect(cards.first()).toContainText("67%");

    // Sort by the time index: player 2 took the most time each game → on top.
    await page.getByRole("button", { name: "Temps" }).click();
    await expect(cards.first()).toContainText(names[2]);

    // Sort back by win rate: player 0 (67%) returns to the top.
    await page.getByRole("button", { name: "Vict." }).click();
    await expect(cards.first()).toContainText(names[0]);

    // Jeux tab: it opens on the first game (Catan, alphabetical) where player 0
    // won both → 100%.
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await expect(
      page.getByText("Statistiques des joueurs sur ce jeu"),
    ).toBeVisible();

    const p0Card = page.getByRole("listitem").filter({ hasText: names[0] });

    await expect(p0Card).toContainText("100%");

    // Pick the other game: player 0 didn't win its only game → 0%.
    await page.getByRole("button", { name: /^Zzz-/ }).first().click();

    await expect(
      page.getByRole("listitem").filter({ hasText: names[0] }),
    ).toContainText("0%");
  } finally {
    await dropSeeded(admin, {
      games: gameIds,
      boardgames: [otherBoardgameId],
      playerNames: names,
    });
  }
});

test("recomputes the ranking from games where the selected players played", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];
  let bgId: string | null = null;

  try {
    const idOf = await playerIds(names);
    const ids = names.map(idOf);

    // A boardgame that allows 2-player games (so one game can exclude a player).
    bgId = await seedBoardgame(admin, {
      name: `Prez-${Date.now().toString(36)}`,
    });

    async function seed(playerIdxs: number[], winnerIdx: number) {
      const gameId = await seedParty(
        admin,
        bgId as string,
        playerIdxs.map(idx => ({
          playerId: ids[idx],
          score: 5,
          isWinner: idx === winnerIdx,
        })),
      );

      gameIds.push(gameId);
      await seedTurns(
        admin,
        gameId,
        playerIdxs.map((idx, seat) => ({
          playerId: ids[idx],
          round: 1,
          turnNo: seat + 1,
          durationS: 20,
        })),
      );
    }

    // Player 0 wins two of three games; the third has no player 2.
    await seed([0, 1, 2], 0);
    await seed([0, 1, 2], 2);
    await seed([0, 1], 0);

    await page.goto("/stats");

    const p0Row = () =>
      page.getByRole("listitem").filter({ hasText: names[0] });

    // Across all 3 games: player 0 won 2 → 67%.
    await expect(p0Row()).toContainText("67%");

    // Keep only games where player 2 was present → drops the 2-player game.
    const presence = page.getByRole("button", {
      name: "Ouvrir la liste : Avec les joueurs",
    });

    await presence.click();
    await page.getByRole("button", { name: names[2], exact: true }).click();
    // Close the dropdown (re-tap the trigger) so its own list items don't
    // shadow the table rows.
    await presence.click();

    // Player 0 now won 1 of 2 → 50%.
    await expect(p0Row()).toContainText("50%");

    // A plain filter's bulk button empties it, and emptying it is what puts
    // every game back in scope — it never means « tous les joueurs à la fois »,
    // which would ask for the games where everybody was at the table.
    await page
      .getByRole("button", { name: "Tout effacer : Avec les joueurs" })
      .click();

    await expect(p0Row()).toContainText("67%");

    // Same command, spelled out in the panel.
    await presence.click();
    await page.getByRole("button", { name: names[2], exact: true }).click();
    await page.getByRole("button", { name: "Tous (réinitialiser)" }).click();
    await presence.click();

    await expect(p0Row()).toContainText("67%");
  } finally {
    await dropSeeded(admin, {
      games: gameIds,
      boardgames: [bgId],
      playerNames: names,
    });
  }
});

/**
 * The games filter on the "Joueurs" tab (full-suite only — untagged): every
 * boardgame counts until one is unticked, the box empties in one tap and fills
 * back in one tap, and it always spells out the shorter of the two sides.
 */
test("narrows the player ranking down to one boardgame in two taps", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];
  const boardgameIds: string[] = [];

  try {
    const idOf = await playerIds(names);
    const ids = names.map(idOf);

    async function seedTracked(name: string) {
      const id = await seedBoardgame(admin, { name });

      boardgameIds.push(id);

      return id;
    }

    async function seedEndedGame(bgId: string, winnerIdx: number) {
      const gameId = await seedParty(
        admin,
        bgId,
        ids.map((playerId, i) => ({
          playerId,
          score: 10 - i,
          isWinner: i === winnerIdx,
        })),
      );

      gameIds.push(gameId);
    }

    const stamp = Date.now().toString(36);
    const kept = `Aaa-${stamp}`;
    const dropped = `Zzz-${stamp}`;
    const third = `Mmm-${stamp}`;

    // Player 0 wins the only party of the first game, and neither of the two
    // others — so the ranking says something different at every step.
    await seedEndedGame(await seedTracked(kept), 0);
    await seedEndedGame(await seedTracked(dropped), 1);
    await seedEndedGame(await seedTracked(third), 1);

    await page.goto("/stats");

    const p0Row = () =>
      page.getByRole("listitem").filter({ hasText: names[0] });
    const games = page.getByRole("button", {
      name: "Ouvrir la liste : Jeux pris en compte",
    });
    const emptyAll = page.getByRole("button", {
      name: "Tout décocher : Jeux pris en compte",
    });
    const fillAll = page.getByRole("button", {
      name: "Tout cocher : Jeux pris en compte",
    });

    // Every game counts to begin with.
    await expect(p0Row()).toBeVisible();

    await games.click();
    await page.getByRole("button", { name: dropped, exact: true }).click();
    await games.click();

    // Two games left of three: the box still names the one taken out, since
    // that is the shorter side. Player 0 won 1 of those 2 → 50%.
    await expect(page.getByText("Tous sauf")).toBeVisible();
    await expect(p0Row()).toContainText("50%");

    // Unticking the last games left is a legitimate state, and it says so
    // instead of quietly counting everything again.
    await emptyAll.click();

    await expect(page.getByText("Aucun jeu sélectionné")).toBeVisible();
    await expect(p0Row()).toHaveCount(0);

    // The same button, now turned round, puts every game back in one tap.
    await fillAll.click();

    await expect(page.getByText("Tous sauf")).toHaveCount(0);
    await expect(p0Row()).toBeVisible();

    // And the whole point: reaching a single game is two taps — empty, then
    // tick it — instead of unticking every other one. The box then names what
    // it keeps rather than the longer list of what it drops.
    await emptyAll.click();
    await games.click();
    await page.getByRole("button", { name: kept, exact: true }).click();
    await games.click();

    await expect(page.getByText("Seulement")).toBeVisible();
    await expect(p0Row()).toContainText("100%");
  } finally {
    await dropSeeded(admin, {
      games: gameIds,
      boardgames: boardgameIds,
      playerNames: names,
    });
  }
});

test("charts the score distribution for a scored game", async ({ page }) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameName = `E2E Scores ${Date.now().toString(36)}`;
  const gameIds: string[] = [];
  let bgId: string | null = null;

  try {
    // A game of its own rather than a real one: the chart is shown on games
    // played FOR the total, and which real game that is has moved before — a
    // race plots its laps instead, so Catan no longer answers here.
    bgId = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 2,
      roundLimit: 3,
      scoring: {
        timing: "final",
        entry: "total",
        winCondition: { type: "highest" },
      },
    });

    const idOf = await playerIds(names);
    const ids = names.map(idOf);

    async function seedScored(scores: number[]) {
      const gameId = await seedParty(
        admin,
        bgId as string,
        ids.map((playerId, i) => ({
          playerId,
          score: scores[i],
          isWinner: i === 0,
        })),
      );

      gameIds.push(gameId);
    }

    // Two scored games → scores 3,5,6,8,10,10.
    await seedScored([10, 6, 3]);
    await seedScored([10, 8, 5]);

    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: gameName, exact: true }).click();

    await expect(page.getByText("Répartition des scores")).toBeVisible();
    await expect(page.getByText(/6 scores · de 3 à 10/)).toBeVisible();

    // Toggle from the histogram to the dot plot.
    await page.getByRole("button", { name: "Nuage de points" }).click();
    await expect(
      page.getByRole("img", { name: "Nuage de points des scores" }),
    ).toBeVisible();
  } finally {
    await dropSeeded(admin, {
      games: gameIds,
      boardgames: [bgId],
      playerNames: names,
    });
  }
});

/**
 * A simultaneous game (Splito, full-suite only — untagged): everyone plays at
 * once, so a round is one shared turn owned by nobody. No share of the time
 * belongs to a player, and the per-player figures that would divide it say so
 * by not being there — on the game's own tab and on a player's breakdown alike.
 */
test("drops the per-player time figures on a simultaneous game", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  let gameId: string | null = null;

  try {
    const idOf = await playerIds(names);
    const ids = names.map(idOf);

    gameId = await seedParty(
      admin,
      await boardgameId("Splito"),
      ids.map((playerId, i) => ({
        playerId,
        score: 30 - i * 5,
        isWinner: i === 0,
      })),
      { round: 2, turn: 2 },
    );

    // Two rounds, each a single turn the whole table played at once.
    await seedTurns(
      admin,
      gameId,
      [1, 2].map(round => ({
        playerId: null,
        round,
        turnNo: round,
        durationS: 120,
      })),
    );

    await page.goto("/stats");

    // A player's breakdown: the Splito line stops at the score.
    await page
      .getByRole("listitem")
      .filter({ hasText: names[0] })
      .first()
      .click();

    const splitoLine = page.getByRole("listitem").filter({ hasText: "Splito" });

    await expect(splitoLine).toBeVisible();
    await expect(splitoLine).not.toContainText("Part du temps");

    // The game's own tab: same rule, and the explanation of an index nobody can
    // read here goes with it.
    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: "Splito", exact: true }).click();

    await expect(
      page.getByText("Statistiques des joueurs sur ce jeu"),
    ).toBeVisible();
    await expect(page.getByText("Part du temps")).toHaveCount(0);
  } finally {
    await dropSeeded(admin, { games: [gameId], playerNames: names });
  }
});

/**
 * A game counted manche by manche (Odin, full-suite only — untagged): it records
 * no turn at all, so the tab drops the time tiles it would fill with zeros and
 * reads the manches instead — how long a party runs, what a manche costs, and
 * who gets out of them.
 */
test("reads Odin's parties in manches rather than in time", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];

  try {
    const idOf = await playerIds(names);
    const ids = names.map(idOf);
    const odinId = await boardgameId("Odin");

    /** One ended party, its manches written down one row per player. */
    async function seedOdin(manches: number[][]) {
      const totals = ids.map((_id, i) =>
        manches.reduce((sum, points) => sum + points[i], 0),
      );
      const best = Math.min(...totals);
      const gameId = await seedParty(
        admin,
        odinId,
        ids.map((playerId, i) => ({
          playerId,
          score: totals[i],
          isWinner: totals[i] === best,
        })),
        { stage: manches.length },
      );

      gameIds.push(gameId);
      await admin.from("game_stage_scores").insert(
        manches.flatMap((points, stage) =>
          ids.map((player_id, i) => ({
            game_id: gameId,
            stage: stage + 1,
            player_id,
            points: points[i],
          })),
        ),
      );
    }

    // Five manches over two parties, 39 points picked up in all.
    await seedOdin([
      [0, 4, 3],
      [5, 0, 2],
    ]);
    await seedOdin([
      [0, 2, 6],
      [3, 0, 1],
      [9, 4, 0],
    ]);

    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: "Odin", exact: true }).click();

    // Nothing timed, so nothing about time — the manches take those tiles.
    await expect(page.getByText("Temps de jeu moy.")).toHaveCount(0);
    await expect(page.getByText("Tour moy.")).toHaveCount(0);
    await expect(page.getByText("Manches moy.")).toBeVisible();
    await expect(page.getByText("2.5")).toBeVisible();
    await expect(page.getByText("Points / manche")).toBeVisible();
    await expect(page.getByText("7.8")).toBeVisible();

    // The two breakdowns only several parties can show.
    await expect(page.getByText("Qui sort le plus souvent")).toBeVisible();
    await expect(page.getByText("1 sortie sur 5 manches")).toBeVisible();
    await expect(page.getByText("Ce que coûte une manche")).toBeVisible();
    await expect(page.getByText(/15 manches de joueur/)).toBeVisible();
  } finally {
    await dropSeeded(admin, { games: gameIds, playerNames: names });
  }
});

/**
 * The framing of a section that reads one subject twice (full-suite only —
 * untagged): « Temps par phase » puts its two charts in a single box, names
 * each of them, and each name carries a bubble saying which parties its figures
 * rest on. Without that, the second chart reads as a detail of the first.
 */
test("names both readings of the phase clocks, and what each rests on", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(3);
  const gameIds: string[] = [];

  try {
    const idOf = await playerIds(names);
    const ids = names.map(idOf);
    const marsId = await boardgameId(TERRAFORMING_MARS_NAME);

    /** One ended party of Terraforming Mars, timed on the given generations. */
    async function seedEndedGame(stages: number[]) {
      const gameId = await seedParty(
        admin,
        marsId,
        ids.map((playerId, i) => ({
          playerId,
          score: 60 - i * 5,
          isWinner: i === 0,
        })),
        { round: stages.length, stage: stages.length },
      );

      gameIds.push(gameId);
      await admin.from("game_phases").insert(
        stages.flatMap(stage => [
          { game_id: gameId, stage, phase_key: "discovery", duration_s: 60 },
          { game_id: gameId, stage, phase_key: "projects", duration_s: 120 },
        ]),
      );
    }

    // The second party stops a generation earlier, so the tail of the chart
    // rests on a single evening — exactly what its bubble warns about.
    await seedEndedGame([1, 2]);
    await seedEndedGame([1]);

    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page
      .getByRole("button", { name: TERRAFORMING_MARS_NAME, exact: true })
      .click();

    const group = page
      .getByTestId("stat-group")
      .filter({ hasText: "Temps par phase" });

    await expect(group).toBeVisible();

    // Both readings are named inside the one box, so neither can be taken for
    // the other. The headings are uppercased by CSS only — the text is not.
    await expect(
      group.getByRole("heading", { name: "Sur toutes les parties" }),
    ).toBeVisible();
    await expect(
      group.getByRole("heading", { name: /génération par génération/ }),
    ).toBeVisible();

    // And the averaged one says what it divides by.
    await group
      .getByRole("button", { name: "génération par génération" })
      .click();

    await expect(page.getByTestId("info-bubble")).toContainText(
      "les parties qui l'ont atteinte",
    );
  } finally {
    await dropSeeded(admin, { games: gameIds, playerNames: names });
  }
});
