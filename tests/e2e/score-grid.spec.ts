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
 * A category sheet counted card by card, laid out as the cards lie (Symbiose's
 * mare, 2 rows of 4 — full-suite only, untagged): a box per card, each zone's
 * boxes adding up to its line of the sheet, and only the lines recorded.
 */

const SCORING = {
  timing: "final",
  entry: "categories",
  winCondition: { type: "highest" },
  sheet: [
    { key: "left", label: "Colonne gauche" },
    { key: "centre", label: "Colonnes centrales" },
    { key: "right", label: "Colonne droite" },
  ],
  grid: {
    rows: 2,
    zones: [
      { category: "left", columns: 1, framed: true },
      { category: "centre", columns: 2 },
      { category: "right", columns: 1, framed: true },
    ],
  },
};

/** Types a player's eight cards: left ×2, centre ×4, right ×2. */
async function fillMare(
  page: Page,
  name: string,
  cards: readonly number[],
): Promise<void> {
  const boxes = [
    ["Colonne gauche", 2],
    ["Colonnes centrales", 4],
    ["Colonne droite", 2],
  ] as const;
  let next = 0;

  for (const [zone, count] of boxes) {
    for (let i = 1; i <= count; i += 1) {
      await page
        .getByRole("spinbutton", { name: `${zone} ${i} — ${name}` })
        .fill(String(cards[next]));
      next += 1;
    }
  }
}

test("records a night counted card by card, line by line", async ({ page }) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const [first, second] = players;
  const games: string[] = [];
  let bgId: string | null = null;
  const name = `E2E Mare ${Date.now().toString(36)}`;

  try {
    bgId = await seedBoardgame(admin, {
      name,
      minPlayers: 2,
      scoring: SCORING,
    });

    await page.goto("/games/finished");
    await page.getByRole("button", { name, exact: true }).click();

    for (const player of players) {
      await page.getByRole("button", { name: player, exact: true }).click();
    }

    await page.getByText("Détail par catégorie").click();
    await expect(
      page.getByTestId("score-grid").getByRole("listitem"),
    ).toHaveCount(2);

    // A card forgotten keeps the night from being recorded.
    await fillMare(page, first, [1, 2, 3, 4, 5, 6, 7, 8]);
    await fillMare(page, second, [2, 2, 2, 2, 2, 2, 2, 2]);
    await page
      .getByRole("spinbutton", { name: `Colonne droite 2 — ${second}` })
      .fill("");
    await expect(page.getByText("Encore 1 case à remplir.")).toBeVisible();
    await page
      .getByRole("spinbutton", { name: `Colonne droite 2 — ${second}` })
      .fill("2");

    // 36 against 16: the first takes it.
    await page.getByRole("button", { name: "Enregistrer la partie" }).click();
    await expect(page).toHaveURL(/\/games$/);

    const idOf = await playerIds(players);
    const { data } = await admin
      .from("game_players")
      .select("game_id, player_id, score, is_winner, score_breakdown")
      .in("player_id", players.map(idOf));

    games.push(data?.[0]?.game_id as string);

    // Only the lines are kept: left 1 + 2, centre 3 + 4 + 5 + 6, right 7 + 8.
    expect(
      Object.fromEntries(
        (data ?? []).map(r => [
          r.player_id,
          [r.score, r.is_winner, r.score_breakdown],
        ]),
      ),
    ).toEqual({
      [idOf(first)]: [36, true, { left: 3, centre: 18, right: 15 }],
      [idOf(second)]: [16, false, { left: 4, centre: 8, right: 4 }],
    });
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});

test("reopens recorded lines in the first box of each zone", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const [first, second] = players;
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: `E2E Mare corrigée ${Date.now().toString(36)}`,
      minPlayers: 2,
      scoring: SCORING,
    });

    const idOf = await playerIds(players);
    const party = await seedParty(admin, bgId, [
      {
        playerId: idOf(first),
        score: 20,
        isWinner: true,
        breakdown: { left: 5, centre: 10, right: 5 },
      },
      {
        playerId: idOf(second),
        score: 18,
        breakdown: { left: 4, centre: 10, right: 4 },
      },
    ]);

    games.push(party);

    await page.goto(`/games/${party}/play`);
    await page.getByRole("button", { name: "Voir le score final" }).click();
    await page.getByRole("button", { name: "Corriger les scores" }).click();

    const form = page.getByTestId("score-correction");

    await expect(
      form.getByRole("spinbutton", { name: `Colonne gauche 1 — ${first}` }),
    ).toHaveValue("5");
    await expect(
      form.getByRole("spinbutton", { name: `Colonne gauche 2 — ${first}` }),
    ).toHaveValue("0");

    // The second's right column really held a 3 more: 21 against 20.
    await form
      .getByRole("spinbutton", { name: `Colonne droite 2 — ${second}` })
      .fill("3");
    await form
      .getByRole("button", { name: "Enregistrer la correction" })
      .click();

    await expect(page.getByTestId("score-correction")).toHaveCount(0);
    await expect
      .poll(async () => {
        const { data } = await admin
          .from("game_players")
          .select("score, is_winner, score_breakdown")
          .eq("game_id", party)
          .eq("player_id", idOf(second))
          .single();

        return data;
      })
      .toEqual({
        score: 21,
        is_winner: true,
        score_breakdown: { left: 4, centre: 10, right: 7 },
      });
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
