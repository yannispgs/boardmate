import { expect, type Locator, type Page, test } from "@playwright/test";

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

/**
 * Sets a player's points in one manche of the grid: the cell opens a dialog
 * with the figure large, nudged five at a time, then validated.
 */
async function setPoints(
  page: Page,
  name: string,
  manche: number,
  points: number,
): Promise<void> {
  await page
    .getByRole("button", { name: new RegExp(`^${name}, manche ${manche} :`) })
    .click();

  const dialog = page.getByRole("dialog", {
    name: `${name} — manche ${manche}`,
  });
  const plus = dialog.getByRole("button", { name: "5 de plus" });

  for (let n = 0; n < points / 5; n++) {
    await plus.click();
  }

  await expect(dialog.getByTestId("dialog-points")).toHaveText(String(points));
  await dialog.getByRole("button", { name: "Valider" }).click();
}

/** The box a player ticks in one manche once he laid his phase down. */
function phaseBox(page: Page, name: string, manche: number): Locator {
  return page.getByRole("checkbox", {
    name: new RegExp(`réalisée — ${name}, manche ${manche}$`),
  });
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

    // One grid: a row per manche, a column per player.
    await expect(page.getByTestId("ladder-grid").getByRole("row")).toHaveCount(
      3,
    );

    // Manche 1: the first goes out on his phase 1, the second keeps 20.
    await setPoints(page, second, 1, 20);
    await phaseBox(page, first, 1).check();

    // Manche 2: the first is now on his phase 2, and clears it with 45 left
    // in hand; the second goes out on his phase 1.
    await expect(phaseBox(page, first, 2)).toHaveAccessibleName(
      `P2 réalisée — ${first}, manche 2`,
    );
    await setPoints(page, first, 2, 45);
    await expect(
      page.getByRole("button", { name: `${first}, manche 2 : 45 points` }),
    ).toBeVisible();
    await phaseBox(page, first, 2).check();
    await phaseBox(page, second, 2).check();

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
