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
        // Ten cards still in hand without the phase down: 50 at the least.
        unclearedMin: 50,
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
 * whose wheel is scrolled to the value — the way a thumb would — then
 * validated.
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
  const value = dialog.getByRole("option", {
    name: String(points),
    exact: true,
  });

  // A value every 40 pixels, the wheel's first at the top: scrolled to it.
  await dialog
    .getByRole("listbox", { name: "Points" })
    .evaluate((el, wanted) => {
      const options = [...el.querySelectorAll('[role="option"]')];
      const index = options.findIndex(o => o.textContent === wanted);

      el.scrollTop = index * 40;
    }, String(points));
  await expect(value).toHaveAttribute("aria-selected", "true");
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

    // The grid opens on as many manches as there are phases — a game played
    // to its end lasts at least that long.
    await page.getByText("Manche par manche").click();

    // One grid: a row per manche, a column per player.
    await expect(page.getByTestId("ladder-grid").getByRole("row")).toHaveCount(
      3,
    );

    // Nothing is guessed: every cell waits for its figure, and the night can't
    // be filed before they all have one.
    await expect(
      page.getByRole("button", { name: `${second}, manche 1 : à saisir` }),
    ).toHaveText("—");
    await expect(
      page.getByText("Manche 1 : il manque les points de certains joueurs."),
    ).toBeVisible();

    // Manche 1: the first lays his phase 1 and goes out; the second keeps
    // his whole hand, 60 — and his wheel cannot go under 50.
    await phaseBox(page, first, 1).check();
    await setPoints(page, first, 1, 0);
    await page
      .getByRole("button", { name: new RegExp(`^${second}, manche 1 :`) })
      .click();
    await expect(
      page.getByRole("option", { name: "45", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Annuler" }).click();
    await setPoints(page, second, 1, 60);

    // Manche 2: the first is now on his phase 2, and clears it with 45 left
    // in hand; the second goes out on his phase 1.
    await expect(phaseBox(page, first, 2)).toHaveAccessibleName(
      `P2 réalisée — ${first}, manche 2`,
    );
    await phaseBox(page, first, 2).check();
    await setPoints(page, first, 2, 45);
    await expect(
      page.getByRole("button", { name: `${first}, manche 2 : 45 points` }),
    ).toBeVisible();
    await phaseBox(page, second, 2).check();
    await setPoints(page, second, 2, 0);

    // The climb decides: the first cleared the last phase, nothing is asked.
    await expect(page.getByText("Qui a gagné ?")).toHaveCount(0);
    await page.getByRole("button", { name: "Enregistrer la partie" }).click();
    await expect(page).toHaveURL(/\/games$/);

    const rows = await recorded(players);
    const idOf = await playerIds(players);

    games.push(rows[0]?.game_id as string);

    expect(
      Object.fromEntries(rows.map(r => [r.player_id, [r.score, r.is_winner]])),
    ).toEqual({ [idOf(first)]: [45, true], [idOf(second)]: [60, false] });

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

test("slides the wheel onto the nearest value when it stops between two", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const game = await seedLadder();

  try {
    await openForm(page, game.name, players);
    await page.getByText("Manche par manche").click();
    await page
      .getByRole("button", { name: new RegExp(`^${players[0]}, manche 1 :`) })
      .click();

    const wheel = page
      .getByRole("dialog", { name: `${players[0]} — manche 1` })
      .getByRole("listbox", { name: "Points" });

    // A flick that dies thirteen pixels past the sixth value (one every 40,
    // from 50): the wheel slides back onto 75, squarely in the band.
    await wheel.evaluate(el => {
      el.scrollTop = 5 * 40 + 13;
    });

    await expect.poll(() => wheel.evaluate(el => el.scrollTop)).toBe(5 * 40);
    await expect(
      wheel.getByRole("option", { name: "75", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  } finally {
    await dropSeeded(admin, {
      games: [],
      boardgames: [game.id],
      playerNames: players,
    });
  }
});
