import { expect, type Page, test } from "@playwright/test";

import {
  adminClient,
  dropSeeded,
  playerIds,
  seedBoardgame,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/**
 * Correcting a finished party's scores from its final score panel (full-suite
 * only — untagged).
 *
 * The entry is the one « Ajouter une partie terminée » uses, opened on what was
 * recorded. The crown follows the corrected sheet; when leaders come out level
 * the table picks among them, whoever was crowned before still picked.
 */

async function openCorrection(page: Page, gameId: string) {
  await page.goto(`/games/${gameId}/play`);
  await page.getByRole("button", { name: "Voir le score final" }).click();
  await page.getByRole("button", { name: "Corriger les scores" }).click();

  return page.getByTestId("score-correction");
}

async function winnersOf(gameId: string): Promise<string[]> {
  const { data } = await adminClient()
    .from("game_players")
    .select("player_id")
    .eq("game_id", gameId)
    .eq("is_winner", true);

  return (data ?? []).map(row => row.player_id as string);
}

test("corrects a total, moves the crown, and asks only when leaders are level", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const [first, second] = players;
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: `E2E Correction ${Date.now().toString(36)}`,
      minPlayers: 2,
      scoring: {
        timing: "final",
        entry: "total",
        winCondition: { type: "highest" },
      },
    });

    const idOf = await playerIds(players);
    const party = await seedParty(
      admin,
      bgId,
      players.map((name, seat) => ({
        playerId: idOf(name),
        score: [10, 8, 5][seat],
        isWinner: seat === 0,
      })),
    );

    games.push(party);

    // The second seat was really on 12: the crown moves on its own.
    let form = await openCorrection(page, party);

    await expect(form.getByLabel(first, { exact: true })).toHaveValue("10");

    await form.getByLabel(second, { exact: true }).fill("12");
    await form
      .getByRole("button", { name: "Enregistrer la correction" })
      .click();

    await expect(page.getByTestId("score-correction")).toHaveCount(0);
    await expect.poll(() => winnersOf(party)).toEqual([idOf(second)]);

    // Now the first seat was on 12 too: level leaders, so the table is asked —
    // with the player it crowned a moment ago still picked.
    form = await openCorrection(page, party);

    await form.getByLabel(first, { exact: true }).fill("12");

    await expect(form.getByRole("button", { name: second })).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Enregistrer la correction" }),
    ).toBeEnabled();

    await form
      .getByRole("button", { name: "Enregistrer la correction" })
      .click();

    await expect(page.getByTestId("score-correction")).toHaveCount(0);
    await expect.poll(() => winnersOf(party)).toEqual([idOf(second)]);

    const { data: scores } = await admin
      .from("game_players")
      .select("player_id, score")
      .eq("game_id", party);

    expect(
      Object.fromEntries((scores ?? []).map(s => [s.player_id, s.score])),
    ).toEqual({ [idOf(first)]: 12, [idOf(second)]: 12, [idOf(players[2])]: 5 });
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});

test("reopens a ring of piles as it was counted", async ({ page }) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: `E2E Tas ${Date.now().toString(36)}`,
      minPlayers: 2,
      scoring: {
        timing: "final",
        entry: "pairs",
        winCondition: { type: "highest" },
      },
    });

    const idOf = await playerIds(players);
    // Piles 2, 5, 3 round the ring: 3×2, 2×5, 5×3.
    const pairs = [
      { left: 3, right: 2 },
      { left: 2, right: 5 },
      { left: 5, right: 3 },
    ];
    const party = await seedParty(
      admin,
      bgId,
      players.map((name, seat) => ({
        playerId: idOf(name),
        score: pairs[seat].left * pairs[seat].right,
        isWinner: seat === 2,
        breakdown: pairs[seat],
      })),
    );

    games.push(party);

    const form = await openCorrection(page, party);

    // Every seat's product is there already: nothing to recount to fix one pile.
    await expect(form.getByLabel(`Score de ${players[0]}`)).toContainText("6");
    await expect(form.getByLabel(`Score de ${players[1]}`)).toContainText("10");
    await expect(form.getByLabel(`Score de ${players[2]}`)).toContainText("15");
    await expect(
      form.getByRole("button", { name: "Enregistrer la correction" }),
    ).toBeEnabled();
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
