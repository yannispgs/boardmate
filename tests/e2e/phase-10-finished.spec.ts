import { expect, type Locator, type Page, test } from "@playwright/test";

import { stagePoints } from "./utils/stage-prompt";
import {
  adminClient,
  dropSeeded,
  playerIds,
  seedBoardgame,
  seedPlayers,
} from "./utils/supabase";

/**
 * A Phase 10 night recorded after the fact (full-suite only — untagged), on a
 * two-phase copy of the game: either the manches one by one with who laid his
 * phase down — the winner then read off the climb — or the final totals alone,
 * which hold no climb, so the table names the winner.
 */

async function seedLadder(): Promise<{ id: string; name: string }> {
  const name = `E2E Phase finie ${Date.now().toString(36)}`;
  const id = await seedBoardgame(adminClient(), {
    name,
    minPlayers: 2,
    isTimed: false,
    scoring: {
      timing: "final",
      entry: "total",
      winCondition: { type: "lowest" },
      trackRecords: false,
    },
    stages: {
      label: "Manche",
      advance: "manual",
      pointsStep: 5,
      ladder: {
        label: "Phase",
        steps: ["2 triplés", "1 triplé + 1 suite de 4"],
      },
    },
  });

  return { id, name };
}

async function openForm(page: Page, game: string, players: string[]) {
  await page.goto("/games/finished");
  await page.getByRole("button", { name: game, exact: true }).click();

  for (const name of players) {
    await page.getByRole("button", { name, exact: true }).click();
  }
}

/** The box a player ticks in one manche once he laid his phase down. */
function phaseBox(manche: Locator, name: string): Locator {
  return manche
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("button", { name: /réalisée/ });
}

async function recorded(players: string[]) {
  const admin = adminClient();
  const idOf = await playerIds(players);
  const { data } = await admin
    .from("game_players")
    .select("game_id, player_id, score, is_winner")
    .in("player_id", players.map(idOf));

  return data ?? [];
}

test("reads the winner off the manches typed in, phases and all", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const [first, second] = players;
  const game = await seedLadder();
  const games: string[] = [];

  try {
    await openForm(page, game.name, players);

    await page.getByText("Manche par manche").click();
    await page.getByRole("button", { name: "+ Ajouter une manche" }).click();
    await page.getByRole("button", { name: "+ Ajouter une manche" }).click();

    const manches = page.getByTestId("ladder-manche");
    const one = manches.nth(0);
    const two = manches.nth(1);

    // Manche 1: the first goes out on his phase 1, the second keeps 20.
    await stagePoints(one, second).fill("20");
    await phaseBox(one, first).click();

    // Manche 2: the first is now on his phase 2, and clears it with 45 left
    // in hand; the second goes out on his phase 1.
    await expect(phaseBox(two, first)).toContainText("Phase 2 réalisée");
    await stagePoints(two, first).fill("45");
    await phaseBox(two, first).click();
    await phaseBox(two, second).click();

    // The climb decides: the first cleared the last phase, nothing is asked.
    await expect(page.getByText("Qui a gagné ?")).toHaveCount(0);
    await page.getByRole("button", { name: "Enregistrer la partie" }).click();
    await expect(page).toHaveURL(/\/games$/);

    const rows = await recorded(players);
    const idOf = await playerIds(players);

    games.push(rows[0]?.game_id as string);

    expect(
      Object.fromEntries(rows.map(r => [r.player_id, [r.score, r.is_winner]])),
    ).toEqual({ [idOf(first)]: [45, true], [idOf(second)]: [20, false] });

    const { data: lines } = await admin
      .from("game_stage_scores")
      .select("stage, player_id, points, cleared")
      .eq("game_id", games[0])
      .order("stage");

    expect(lines?.filter(l => l.cleared)).toHaveLength(3);
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [game.id],
      playerNames: players,
    });
  }
});

test("asks for the winner when only the final totals were kept", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const [first, second] = players;
  const game = await seedLadder();
  const games: string[] = [];

  try {
    await openForm(page, game.name, players);

    await page.getByRole("spinbutton", { name: first }).fill("60");
    await page.getByRole("spinbutton", { name: second }).fill("15");

    // The totals hold no climb: the table says who won, the lower total or not.
    await expect(page.getByText("Qui a gagné ?")).toBeVisible();

    const save = page.getByRole("button", { name: "Enregistrer la partie" });

    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: first, exact: true }).click();
    await save.click();
    await expect(page).toHaveURL(/\/games$/);

    const rows = await recorded(players);
    const idOf = await playerIds(players);

    games.push(rows[0]?.game_id as string);

    expect(rows.find(r => r.player_id === idOf(first))?.is_winner).toBe(true);
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [game.id],
      playerNames: players,
    });
  }
});
