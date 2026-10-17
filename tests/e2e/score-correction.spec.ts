import { expect, type Page, test } from "@playwright/test";
import { stagePoints } from "./utils/stage-prompt";
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
 * the table picks among them, whoever was crowned before still picked. A game
 * counted manche by manche is corrected one manche at a time, its totals summed.
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

test("corrects a manche of a game counted manche by manche", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const [first, second] = players;
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: `E2E Manches ${Date.now().toString(36)}`,
      minPlayers: 2,
      isTimed: false,
      stages: { label: "Manche", advance: "manual", maxPoints: 9 },
      scoring: {
        timing: "final",
        entry: "total",
        winCondition: { type: "lowest" },
      },
    });

    const idOf = await playerIds(players);
    // Manche 1: 0 / 4, manche 2: 6 / 0 → 6 / 4, the second seat wins.
    const party = await seedParty(
      admin,
      bgId,
      [
        { playerId: idOf(first), score: 6, isWinner: false },
        { playerId: idOf(second), score: 4, isWinner: true },
      ],
      { stage: 2 },
    );

    games.push(party);

    await admin.from("game_stage_scores").insert([
      { game_id: party, stage: 1, player_id: idOf(first), points: 0 },
      { game_id: party, stage: 1, player_id: idOf(second), points: 4 },
      { game_id: party, stage: 2, player_id: idOf(first), points: 6 },
      { game_id: party, stage: 2, player_id: idOf(second), points: 0 },
    ]);

    const form = await openCorrection(page, party);

    // The first seat really kept 2 in manche 2, not 6: 2 / 4, the crown moves.
    await form.getByRole("button", { name: /^Manche 2/ }).click();

    const prompt = page.getByRole("dialog", { name: "Points de la manche 2" });

    await stagePoints(prompt, first).fill("2");
    await prompt.getByRole("button", { name: "Valider" }).click();

    await form
      .getByRole("button", { name: "Enregistrer la correction" })
      .click();

    await expect(page.getByTestId("score-correction")).toHaveCount(0);
    await expect.poll(() => winnersOf(party)).toEqual([idOf(first)]);

    const { data: manche } = await admin
      .from("game_stage_scores")
      .select("points")
      .eq("game_id", party)
      .eq("stage", 2)
      .eq("player_id", idOf(first))
      .single();
    const { data: scores } = await admin
      .from("game_players")
      .select("player_id, score")
      .eq("game_id", party);

    expect(manche?.points).toBe(2);
    expect(
      Object.fromEntries((scores ?? []).map(s => [s.player_id, s.score])),
    ).toEqual({ [idOf(first)]: 2, [idOf(second)]: 4 });
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});

test("sums a reopened manche into the goals line of the sheet", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const [first, second] = players;
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: `E2E Objectifs ${Date.now().toString(36)}`,
      minPlayers: 2,
      stages: { label: "Manche", advance: "schedule", schedule: [2, 2] },
      scoring: {
        timing: "final",
        entry: "categories",
        winCondition: { type: "highest" },
        sheet: [
          { key: "oiseaux", label: "Oiseaux" },
          {
            key: "manches",
            label: "Objectifs de manche",
            derived: "stageGoals",
          },
        ],
      },
    });

    const idOf = await playerIds(players);
    // Birds 10 / 12, goals 5 + 3 / 2 + 2 → 18 / 16.
    const party = await seedParty(admin, bgId, [
      {
        playerId: idOf(first),
        score: 18,
        isWinner: true,
        breakdown: { oiseaux: 10, manches: 8 },
      },
      {
        playerId: idOf(second),
        score: 16,
        breakdown: { oiseaux: 12, manches: 4 },
      },
    ]);

    games.push(party);

    await admin.from("game_stage_scores").insert([
      { game_id: party, stage: 1, player_id: idOf(first), points: 5 },
      { game_id: party, stage: 1, player_id: idOf(second), points: 2 },
      { game_id: party, stage: 2, player_id: idOf(first), points: 3 },
      { game_id: party, stage: 2, player_id: idOf(second), points: 2 },
    ]);

    const form = await openCorrection(page, party);

    // The first seat took 1 on manche 1, not 5: goals 4, total 14 — the crown
    // goes to the second seat's 16.
    await form.getByRole("button", { name: /^Manche 1/ }).click();

    const prompt = page.getByRole("dialog", { name: "Points de la manche 1" });

    await stagePoints(prompt, first).fill("1");
    await prompt.getByRole("button", { name: "Valider" }).click();

    await expect(form.getByText("14 pts")).toBeVisible();

    await form
      .getByRole("button", { name: "Enregistrer la correction" })
      .click();

    await expect(page.getByTestId("score-correction")).toHaveCount(0);
    await expect.poll(() => winnersOf(party)).toEqual([idOf(second)]);

    const { data: seat } = await admin
      .from("game_players")
      .select("score, score_breakdown")
      .eq("game_id", party)
      .eq("player_id", idOf(first))
      .single();

    expect(seat).toEqual({
      score: 14,
      score_breakdown: { oiseaux: 10, manches: 4 },
    });
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
