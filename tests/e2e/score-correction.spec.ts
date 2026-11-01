import { expect, type Locator, type Page, test } from "@playwright/test";
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

/** A finished party seated for a correction, and how to name its players. */
interface CorrectionTable {
  admin: ReturnType<typeof adminClient>;
  party: string;
  players: string[];
  idOf: (name: string) => string;
}

/** One manche line as recorded: stage, player, points, and the phase tick. */
type MancheLine = [
  stage: number,
  player: string,
  points: number,
  cleared?: boolean,
];

/**
 * Seeds a copy of a game, `players` players and one finished party of it —
 * its seats, and its manches when it has some — plays `play` at that table,
 * then clears it all away.
 */
async function atCorrectionTable(
  setup: Readonly<{
    name: string;
    players: number;
    boardgame: Omit<Parameters<typeof seedBoardgame>[1], "name">;
    seats: (
      idOf: (name: string) => string,
      players: string[],
    ) => Parameters<typeof seedParty>[2];
    manches?: (players: string[]) => MancheLine[];
  }>,
  play: (table: CorrectionTable) => Promise<void>,
): Promise<void> {
  const admin = adminClient();
  const players = await seedPlayers(setup.players);
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: `${setup.name} ${Date.now().toString(36)}`,
      minPlayers: 2,
      ...setup.boardgame,
    });

    const idOf = await playerIds(players);
    const party = await seedParty(admin, bgId, setup.seats(idOf, players));

    games.push(party);

    const manches = setup.manches?.(players) ?? [];

    if (manches.length > 0) {
      // Every column named on every row: a bulk insert sends NULL, not the
      // column's default, for a key one row leaves out.
      await admin.from("game_stage_scores").insert(
        manches.map(([stage, name, points, cleared]) => ({
          game_id: party,
          stage,
          player_id: idOf(name),
          points,
          cleared: cleared === true,
        })),
      );
    }

    await play({ admin, party, players, idOf });
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
}

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

/** Saves the correction, and waits for the crown to land on `winner`. */
async function saveCorrection(
  page: Page,
  form: Locator,
  party: string,
  winner: string,
): Promise<void> {
  await form.getByRole("button", { name: "Enregistrer la correction" }).click();

  await expect(page.getByTestId("score-correction")).toHaveCount(0);
  await expect.poll(() => winnersOf(party)).toEqual([winner]);
}

/** Reopens manche `stage` from the correction, and returns its prompt. */
async function reopenManche(
  page: Page,
  form: Locator,
  stage: number,
): Promise<Locator> {
  await form
    .getByRole("button", { name: new RegExp(`^Manche ${stage}`) })
    .click();

  return page.getByRole("dialog", { name: `Points de la manche ${stage}` });
}

/** Each seat's recorded total, by player id. */
async function totalsOf(
  admin: ReturnType<typeof adminClient>,
  party: string,
): Promise<Record<string, number>> {
  const { data } = await admin
    .from("game_players")
    .select("player_id, score")
    .eq("game_id", party);

  return Object.fromEntries((data ?? []).map(s => [s.player_id, s.score]));
}

test("corrects a total, moves the crown, and asks only when leaders are level", async ({
  page,
}) => {
  await atCorrectionTable(
    {
      name: "E2E Correction",
      players: 3,
      boardgame: {
        scoring: {
          timing: "final",
          entry: "total",
          winCondition: { type: "highest" },
        },
      },
      seats: (idOf, players) =>
        players.map((name, seat) => ({
          playerId: idOf(name),
          score: [10, 8, 5][seat],
          isWinner: seat === 0,
        })),
    },
    async ({ admin, party, players, idOf }) => {
      const [first, second, third] = players;

      // The second seat was really on 12: the crown moves on its own.
      let form = await openCorrection(page, party);

      await expect(form.getByLabel(first, { exact: true })).toHaveValue("10");

      await form.getByLabel(second, { exact: true }).fill("12");
      await saveCorrection(page, form, party, idOf(second));

      // Now the first seat was on 12 too: level leaders, so the table is
      // asked — with the player it crowned a moment ago still picked.
      form = await openCorrection(page, party);

      await form.getByLabel(first, { exact: true }).fill("12");

      await expect(form.getByRole("button", { name: second })).toBeVisible();
      await saveCorrection(page, form, party, idOf(second));

      expect(await totalsOf(admin, party)).toEqual({
        [idOf(first)]: 12,
        [idOf(second)]: 12,
        [idOf(third)]: 5,
      });
    },
  );
});

test("reopens a ring of piles as it was counted", async ({ page }) => {
  // Piles 2, 5, 3 round the ring: 3×2, 2×5, 5×3.
  const pairs = [
    { left: 3, right: 2 },
    { left: 2, right: 5 },
    { left: 5, right: 3 },
  ];

  await atCorrectionTable(
    {
      name: "E2E Tas",
      players: 3,
      boardgame: {
        scoring: {
          timing: "final",
          entry: "pairs",
          winCondition: { type: "highest" },
        },
      },
      seats: (idOf, players) =>
        players.map((name, seat) => ({
          playerId: idOf(name),
          score: pairs[seat].left * pairs[seat].right,
          isWinner: seat === 2,
          breakdown: pairs[seat],
        })),
    },
    async ({ party, players }) => {
      const form = await openCorrection(page, party);

      // Every seat's product is there already: nothing to recount to fix one
      // pile.
      await expect(form.getByLabel(`Score de ${players[0]}`)).toContainText(
        "6",
      );
      await expect(form.getByLabel(`Score de ${players[1]}`)).toContainText(
        "10",
      );
      await expect(form.getByLabel(`Score de ${players[2]}`)).toContainText(
        "15",
      );
      await expect(
        form.getByRole("button", { name: "Enregistrer la correction" }),
      ).toBeEnabled();
    },
  );
});

test("corrects a manche of a game counted manche by manche", async ({
  page,
}) => {
  await atCorrectionTable(
    {
      name: "E2E Manches",
      players: 2,
      boardgame: {
        isTimed: false,
        stages: { label: "Manche", advance: "manual", maxPoints: 9 },
        scoring: {
          timing: "final",
          entry: "total",
          winCondition: { type: "lowest" },
        },
      },
      // Manche 1: 0 / 4, manche 2: 6 / 0 → 6 / 4, the second seat wins.
      seats: (idOf, [first, second]) => [
        { playerId: idOf(first), score: 6, isWinner: false },
        { playerId: idOf(second), score: 4, isWinner: true },
      ],
      manches: ([first, second]) => [
        [1, first, 0],
        [1, second, 4],
        [2, first, 6],
        [2, second, 0],
      ],
    },
    async ({ admin, party, players, idOf }) => {
      const [first, second] = players;
      const form = await openCorrection(page, party);

      // The first seat really kept 2 in manche 2, not 6: 2 / 4, the crown
      // moves.
      const prompt = await reopenManche(page, form, 2);

      await stagePoints(prompt, first).fill("2");
      await prompt.getByRole("button", { name: "Valider" }).click();
      await saveCorrection(page, form, party, idOf(first));

      const { data: manche } = await admin
        .from("game_stage_scores")
        .select("points")
        .eq("game_id", party)
        .eq("stage", 2)
        .eq("player_id", idOf(first))
        .single();

      expect(manche?.points).toBe(2);
      expect(await totalsOf(admin, party)).toEqual({
        [idOf(first)]: 2,
        [idOf(second)]: 4,
      });
    },
  );
});

test("sums a reopened manche into the goals line of the sheet", async ({
  page,
}) => {
  await atCorrectionTable(
    {
      name: "E2E Objectifs",
      players: 2,
      boardgame: {
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
      },
      // Birds 10 / 12, goals 5 + 3 / 2 + 2 → 18 / 16.
      seats: (idOf, [first, second]) => [
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
      ],
      manches: ([first, second]) => [
        [1, first, 5],
        [1, second, 2],
        [2, first, 3],
        [2, second, 2],
      ],
    },
    async ({ admin, party, players, idOf }) => {
      const [first, second] = players;
      const form = await openCorrection(page, party);

      // The first seat took 1 on manche 1, not 5: goals 4, total 14 — the
      // crown goes to the second seat's 16.
      const prompt = await reopenManche(page, form, 1);

      await stagePoints(prompt, first).fill("1");
      await prompt.getByRole("button", { name: "Valider" }).click();

      await expect(form.getByText("14 pts")).toBeVisible();
      await saveCorrection(page, form, party, idOf(second));

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
    },
  );
});

test("corrects a Phase 10 manche, its phases and all, and lets the climb crown", async ({
  page,
}) => {
  await atCorrectionTable(
    {
      name: "E2E Correction phases",
      players: 2,
      boardgame: {
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
          ladder: { label: "Phase", steps: ["a", "b"], unclearedMin: 50 },
        },
      },
      // Each cleared one phase: level climbers, the fewest points (55) won.
      seats: (idOf, [first, second]) => [
        { playerId: idOf(first), score: 55, isWinner: true },
        { playerId: idOf(second), score: 60 },
      ],
      manches: ([first, second]) => [
        [1, first, 0, true],
        [1, second, 60],
        [2, first, 55],
        [2, second, 0, true],
      ],
    },
    async ({ admin, party, players, idOf }) => {
      const second = players[1];
      const form = await openCorrection(page, party);

      // The second had in fact laid his phase in manche 1 too: two phases,
      // the top of the ladder — he takes it, on more points.
      const prompt = await reopenManche(page, form, 1);

      await prompt
        .getByRole("listitem")
        .filter({ hasText: second })
        .getByRole("button", { name: /réalisée/ })
        .click();
      await prompt.getByRole("button", { name: "Valider" }).click();
      await saveCorrection(page, form, party, idOf(second));

      const { data: line } = await admin
        .from("game_stage_scores")
        .select("cleared")
        .eq("game_id", party)
        .eq("stage", 1)
        .eq("player_id", idOf(second))
        .single();

      expect(line?.cleared).toBe(true);
    },
  );
});
