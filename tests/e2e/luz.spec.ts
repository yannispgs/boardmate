import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  adminClient,
  dropSeeded,
  playerIds,
  seedBoardgame,
  seedParty,
  seedPlayers,
} from "./utils/supabase";
import { pickOnWheel } from "./utils/wheel";

/**
 * A game played on bets, donne by donne (Luz, full-suite only — untagged), on
 * a two-donne copy of the game so a party fits in two.
 *
 * Each donne the table writes down only what every bet paid, picked on a wheel
 * of what the rules can pay, and whether the player took the safety token. The
 * game stops after its last donne; the highest total wins, the last donne
 * breaking a level one.
 */

const BET = {
  win: 10,
  hedgedWin: 5,
  missPerTrick: 5,
  tricks: 10,
  hedgeLabel: "Jeton Sécurité",
};

/** Seeds a two-donne copy of Luz and the two players who sit at it. */
async function seedLuz(
  admin: ReturnType<typeof adminClient>,
  name: string,
): Promise<string> {
  return seedBoardgame(admin, {
    name: `${name} ${Date.now().toString(36)}`,
    minPlayers: 2,
    isTimed: false,
    scoring: {
      timing: "final",
      entry: "total",
      winCondition: { type: "highest" },
      allowNegative: true,
      extraRecords: ["worstStage", "betsWon", "betStreak"],
      tieBreak: [
        {
          key: "lastStage",
          label: "Le plus de points à la dernière donne",
          source: "lastStage",
        },
      ],
    },
    stages: { label: "Donne", advance: "manual", count: 2, bet: BET },
  });
}

/** One player's line in the end-of-donne prompt. */
function line(prompt: Locator, name: string): Locator {
  return prompt.getByRole("listitem").filter({ hasText: name });
}

/** Opens a player's points on the wheel and picks `points`. */
async function betPoints(
  prompt: Locator,
  name: string,
  donne: number,
  points: number,
): Promise<void> {
  await prompt
    .getByRole("button", { name: new RegExp(`^${name}, donne ${donne} :`) })
    .click();
  await pickOnWheel(prompt, points);
}

/** Closes donne `donne` with what each player's bet paid. */
async function closeDonne(
  page: Page,
  donne: number,
  lines: Array<{ name: string; points: number; hedged?: boolean }>,
): Promise<Locator> {
  await page
    .getByRole("button", { name: `Fin de la donne ${donne} →` })
    .click();

  const prompt = page.getByRole("dialog", {
    name: `Points de la donne ${donne}`,
  });

  for (const { name, points, hedged } of lines) {
    if (hedged === true) {
      await line(prompt, name)
        .getByRole("button", { name: "Jeton Sécurité" })
        .click();
    }

    await betPoints(prompt, name, donne, points);
  }

  await prompt.getByRole("button", { name: "Valider" }).click();

  return page.getByRole("dialog", { name: `Fin de la donne ${donne}` });
}

test("writes the bets down donne by donne and crowns the highest total", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const [first, second] = players;
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedLuz(admin, "E2E Luz");

    const idOf = await playerIds(players);
    const party = await seedParty(
      admin,
      bgId,
      players.map(name => ({ playerId: idOf(name), score: null })),
      { ongoing: true, stage: 1 },
    );

    games.push(party);
    await page.goto(`/games/${party}/play`);

    await expect(
      page.getByText("La partie dure 2 donnes : le plus gros total gagne."),
    ).toBeVisible();

    // Donne 1: nothing can be validated until every bet is written down, and
    // the wheel offers only what the rules pay — 10 for a won bet, 5 with the
    // token, a miss by fives.
    await page.getByRole("button", { name: "Fin de la donne 1 →" }).click();

    const one = page.getByRole("dialog", { name: "Points de la donne 1" });

    await expect(
      one.getByText("Il manque les points de certains joueurs."),
    ).toBeVisible();
    await betPoints(one, first, 1, 10);

    // Hedging a won bet moves it to the token's rate.
    await line(one, first)
      .getByRole("button", { name: "Jeton Sécurité" })
      .click();
    await expect(
      one.getByRole("button", { name: `${first}, donne 1 : 5 points` }),
    ).toBeVisible();
    await line(one, first)
      .getByRole("button", { name: "Jeton Sécurité" })
      .click();

    await betPoints(one, second, 1, -10);
    await one.getByRole("button", { name: "Valider" }).click();

    await page
      .getByRole("dialog", { name: "Fin de la donne 1" })
      .getByRole("button", { name: "Donne 2" })
      .click();

    // Donne 2 pays double: 20 for a won bet, 10 with the token.
    const recap = await closeDonne(page, 2, [
      { name: first, points: -5 },
      { name: second, points: 10, hedged: true },
    ]);

    await expect(
      recap.getByText("C'était la 2ᵉ donne : la partie s'arrête ici."),
    ).toBeVisible();
    await recap.getByRole("button", { name: "Voir le classement" }).click();

    // 10 − 5 against −10 + 10: the first takes it.
    await expect
      .poll(async () => {
        const { data } = await admin
          .from("game_players")
          .select("player_id, score, is_winner")
          .eq("game_id", party);

        return Object.fromEntries(
          (data ?? []).map(r => [r.player_id, [r.score, r.is_winner]]),
        );
      })
      .toEqual({
        [idOf(first)]: [5, true],
        [idOf(second)]: [0, false],
      });

    // The token is kept with the donne it was taken on.
    const { data: lines } = await admin
      .from("game_stage_scores")
      .select("stage, player_id, points, hedged")
      .eq("game_id", party)
      .order("stage");

    expect(
      (lines ?? []).filter(l => l.hedged).map(l => [l.stage, l.player_id]),
    ).toEqual([[2, idOf(second)]]);

    // The finished game reads the bets, and tags the token in the detail.
    await page.goto(`/games/${party}/play`);
    await expect(page.getByTestId("bet-players")).toBeVisible();
    await expect(
      page.getByText(/a perdu 10 points à la donne 1/),
    ).toBeVisible();

    await page.getByRole("button", { name: "Voir le score final" }).click();
    await page
      .getByRole("button", { name: "Afficher le détail des scores" })
      .click();
    // Exact: the players' random suffix may itself hold an « s ».
    await expect(
      page.getByTestId("stage-detail").getByText("S", { exact: true }),
    ).toHaveCount(1);
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});

test("breaks a level total on the last donne", async ({ page }) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const [first, second] = players;
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedLuz(admin, "E2E Luz égalité");

    const idOf = await playerIds(players);
    const party = await seedParty(
      admin,
      bgId,
      players.map(name => ({ playerId: idOf(name), score: null })),
      { ongoing: true, stage: 1 },
    );

    games.push(party);
    await page.goto(`/games/${party}/play`);

    await (
      await closeDonne(page, 1, [
        { name: first, points: 10 },
        { name: second, points: -15 },
      ])
    )
      .getByRole("button", { name: "Donne 2" })
      .click();

    // 5 each — and the second took more on the last donne.
    const recap = await closeDonne(page, 2, [
      { name: first, points: -5 },
      { name: second, points: 20 },
    ]);

    await recap.getByRole("button", { name: "Voir le classement" }).click();

    // The reveal uncovers the two of them level at the top, and offers to
    // settle it.
    await page.getByRole("button", { name: "Afficher" }).click();
    await page.getByRole("button", { name: "Départager" }).click();

    const tie = page.getByRole("dialog", { name: "Égalité" });

    await expect(
      tie.getByText("Le plus de points à la dernière donne"),
    ).toBeVisible();
    await tie.getByRole("button", { name: "Terminer" }).click();

    await expect
      .poll(async () => {
        const { data } = await admin
          .from("game_players")
          .select("player_id")
          .eq("game_id", party)
          .eq("is_winner", true);

        return (data ?? []).map(r => r.player_id);
      })
      .toEqual([idOf(second)]);
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});

test("records a night typed in afterwards, donne by donne", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const [first, second] = players;
  const games: string[] = [];
  let bgId: string | null = null;
  const name = `E2E Luz finie ${Date.now().toString(36)}`;

  try {
    bgId = await seedBoardgame(admin, {
      name,
      minPlayers: 2,
      isTimed: false,
      scoring: {
        timing: "final",
        entry: "total",
        winCondition: { type: "highest" },
        allowNegative: true,
      },
      stages: { label: "Donne", advance: "manual", count: 2, bet: BET },
    });

    await page.goto("/games/finished");
    await page.getByRole("button", { name, exact: true }).click();

    for (const player of players) {
      await page.getByRole("button", { name: player, exact: true }).click();
    }

    // The grid opens on the game's two donnes.
    await page.getByText("Donne par donne").click();
    await expect(page.getByTestId("bet-grid").getByRole("row")).toHaveCount(3);

    const cell = async (player: string, donne: number, points: number) => {
      await page
        .getByRole("button", {
          name: new RegExp(`^${player}, donne ${donne} :`),
        })
        .click();
      await pickOnWheel(
        page.getByRole("dialog", { name: `${player} — donne ${donne}` }),
        points,
      );
    };

    // The token on donne 2 changes what the wheel offers: 10, not 20.
    await page
      .getByRole("checkbox", {
        name: `Jeton Sécurité — ${second}, donne 2`,
      })
      .check();
    await cell(first, 1, -5);
    await cell(second, 1, 10);
    await cell(first, 2, 20);
    await cell(second, 2, 10);

    // 15 against 20: read off the donnes, nobody to name.
    await page.getByRole("button", { name: "Enregistrer la partie" }).click();
    await expect(page).toHaveURL(/\/games$/);

    const idOf = await playerIds(players);
    const { data } = await admin
      .from("game_players")
      .select("game_id, player_id, score, is_winner")
      .in("player_id", players.map(idOf));

    games.push(data?.[0]?.game_id as string);

    expect(
      Object.fromEntries(
        (data ?? []).map(r => [r.player_id, [r.score, r.is_winner]]),
      ),
    ).toEqual({
      [idOf(first)]: [15, false],
      [idOf(second)]: [20, true],
    });

    const { data: hedged } = await admin
      .from("game_stage_scores")
      .select("stage, player_id")
      .eq("game_id", games[0])
      .eq("hedged", true);

    expect(hedged).toEqual([{ stage: 2, player_id: idOf(second) }]);
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
});
