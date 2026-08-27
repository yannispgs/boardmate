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
    // A race: the party stops when someone reaches the target, and the biggest
    // total wins it — the one shape of game that keeps a speed record.
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
              timing: "live",
              entry: "total",
              stopCondition: { type: "scoreTarget", field: "pointsToWin" },
              winCondition: { type: "highest" },
            },
          })
          .select("id")
          .single()
      ).data?.id ?? null;

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
    for (const id of seeded) {
      await admin.from("games").delete().eq("id", id);
    }
    if (bgId) {
      await admin.from("config_templates").delete().eq("boardgame_id", bgId);
      await admin.from("boardgames").delete().eq("id", bgId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
