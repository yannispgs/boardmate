import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { adminClient, playerIds, seedPlayers } from "./utils/supabase";

/**
 * The mark a race leaves behind (full-suite only — untagged): on a game that
 * ends when someone reaches a score, the total says nothing — everyone stops at
 * the same figure — so what is worth keeping is how few laps of the table it
 * took to get there.
 *
 * Both parties are put in the books directly: the screen that announces the
 * record is the finished-game screen, and it reads the same history whether the
 * party was just played or opened again a week later.
 */

/**
 * A game that is raced: it stops when someone reaches a target, and the biggest
 * total takes it. Nothing is declared beyond that — the shape of the scoring is
 * what makes the laps worth counting.
 */
async function seedRaceGame(
  admin: SupabaseClient,
  name: string,
): Promise<string> {
  const { data: boardgame } = await admin
    .from("boardgames")
    .insert({
      name,
      min_players: 1,
      max_players: 4,
      round_limit: null,
      scoring: {
        timing: "live",
        entry: "total",
        stopCondition: { type: "scoreTarget", field: "pointsToWin" },
        winCondition: { type: "highest" },
      },
    })
    .select("id")
    .single();
  const bgId = boardgame?.id as string;

  await admin.from("config_templates").insert({
    boardgame_id: bgId,
    fields: [
      {
        key: "pointsToWin",
        label: "Points pour gagner",
        type: "integer",
        default: 10,
      },
    ],
  });

  return bgId;
}

/** Drops a seeded game and everything hung off it. */
async function dropRaceGame(
  admin: SupabaseClient,
  bgId: string | null,
  games: readonly string[],
): Promise<void> {
  for (const id of games) {
    await admin.from("games").delete().eq("id", id);
  }

  if (bgId) {
    await admin.from("config_templates").delete().eq("boardgame_id", bgId);
    await admin.from("boardgames").delete().eq("id", bgId);
  }
}

/** A finished race: the laps it took, the line it raced to, and who took it. */
async function seedRace(
  admin: SupabaseClient,
  bgId: string,
  race: Readonly<{
    rounds: number;
    target: number;
    players: Array<{ playerId: string; score: number; isWinner?: boolean }>;
    /** A party keyed in after the fact logs no turn — and never raced. */
    played?: boolean;
  }>,
): Promise<string> {
  const { data: game } = await admin
    .from("games")
    .insert({
      boardgame_id: bgId,
      status: "ended",
      round: race.rounds,
      turn: 1,
      ended_at: new Date().toISOString(),
      config_values: { pointsToWin: race.target },
    })
    .select("id")
    .single();
  const gameId = game?.id as string;

  await admin.from("game_players").insert(
    race.players.map((p, seat) => ({
      game_id: gameId,
      player_id: p.playerId,
      seat_order: seat,
      is_winner: p.isWinner === true,
      score: p.score,
    })),
  );

  if (race.played !== false) {
    await admin.from("game_turns").insert({
      game_id: gameId,
      player_id: race.players[0]?.playerId,
      round: 1,
      turn_no: 1,
      duration_s: 30,
    });
  }

  return gameId;
}

test("announces the speed record a party took, and only on its own course", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Course ${Date.now().toString(36)}`;
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedRaceGame(admin, gameName);

    const idOf = await playerIds(players);
    const table = (winner: number) => {
      return players.map((name, seat) => ({
        playerId: idOf(name),
        score: seat === winner ? 10 : 5,
        isWinner: seat === winner,
      }));
    };

    // The mark to beat: twelve laps to reach 10, at a table of three.
    seeded.push(
      await seedRace(admin, bgId as string, {
        rounds: 12,
        target: 10,
        players: table(1),
      }),
    );

    // A quicker race, but to another finish line — no comparison, so it takes
    // nothing off the party below.
    seeded.push(
      await seedRace(admin, bgId as string, {
        rounds: 4,
        target: 12,
        players: table(1),
      }),
    );

    // Nine laps to the same line, at the same table: the record changes hands.
    const record = await seedRace(admin, bgId as string, {
      rounds: 9,
      target: 10,
      players: table(0),
    });

    seeded.push(record);

    await page.goto(`/games/${record}/play`);
    await expect(page.getByText("⚡ Record de rapidité battu !")).toBeVisible();
    await expect(
      page.getByText("9 tours à 3 joueurs pour 10 points — ancien record : 12"),
    ).toBeVisible();

    // The party that held it says nothing: on its own evening it beat nobody.
    await page.goto(`/games/${seeded[0]}/play`);
    await expect(page.getByText("Partie terminée !")).toBeVisible();
    await expect(page.getByText("Record de rapidité battu !")).toHaveCount(0);

    // A party keyed in after the fact never left the first lap: its « one lap »
    // is the column's default, not a race, so it takes no record.
    const typedIn = await seedRace(admin, bgId as string, {
      rounds: 1,
      target: 10,
      players: table(2),
      played: false,
    });

    seeded.push(typedIn);

    await page.goto(`/games/${typedIn}/play`);
    await expect(page.getByText("Partie terminée !")).toBeVisible();
    await expect(page.getByText("Record de rapidité battu !")).toHaveCount(0);
  } finally {
    await dropRaceGame(admin, bgId, seeded);
    await admin.from("players").delete().in("name", players);
  }
});

/**
 * The same reading, spread over every party instead of one: on a game that is
 * raced, the statistics tab plots how long a party takes in laps, where a game
 * played for the total plots the totals. Full-suite only (untagged).
 */
test("plots the laps a raced game takes, and only there", async ({ page }) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const stamp = Date.now().toString(36);
  const raceName = `E2E Course ${stamp}`;
  const scoredName = `E2E Total ${stamp}`;
  const raced: string[] = [];
  const scoredGames: string[] = [];
  let raceId: string | null = null;
  let scoredId: string | null = null;

  try {
    raceId = await seedRaceGame(admin, raceName);

    const idOf = await playerIds(players);
    const table = players.map((name, seat) => ({
      playerId: idOf(name),
      score: seat === 0 ? 10 : 5,
      isWinner: seat === 0,
    }));

    for (const rounds of [12, 4, 9]) {
      raced.push(
        await seedRace(admin, raceId, { rounds, target: 10, players: table }),
      );
    }

    // Keyed in after the fact: no turn logged, so its « one lap » was never
    // played and would drag the fast end of the chart down to a party nobody
    // raced.
    raced.push(
      await seedRace(admin, raceId, {
        rounds: 1,
        target: 10,
        players: table,
        played: false,
      }),
    );

    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: raceName, exact: true }).click();

    await expect(
      page.getByText("Répartition du nombre de tours"),
    ).toBeVisible();
    await expect(
      page.getByText(/3 parties · de 4 à 12 tours · moyenne 8\.3/),
    ).toBeVisible();

    // The laps replace the scores rather than joining them: everyone stops at
    // the finish line, which the scenario and the table move, so the spread of
    // the totals compares nothing.
    await expect(page.getByText("Répartition des scores")).toHaveCount(0);

    // A game played for the total has no finish line to race to, so the laps it
    // took say nothing — only the scores are plotted.
    scoredId =
      (
        await admin
          .from("boardgames")
          .insert({
            name: scoredName,
            min_players: 1,
            max_players: 4,
            round_limit: 3,
            scoring: {
              timing: "final",
              entry: "total",
              winCondition: { type: "highest" },
            },
          })
          .select("id")
          .single()
      ).data?.id ?? null;

    scoredGames.push(
      await seedRace(admin, scoredId as string, {
        rounds: 3,
        target: 10,
        players: table,
      }),
    );

    await page.reload();
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: scoredName, exact: true }).click();

    await expect(page.getByText("Répartition des scores")).toBeVisible();
    await expect(page.getByText("Répartition du nombre de tours")).toHaveCount(
      0,
    );
  } finally {
    await dropRaceGame(admin, raceId, raced);
    await dropRaceGame(admin, scoredId, scoredGames);
    await admin.from("players").delete().in("name", players);
  }
});
