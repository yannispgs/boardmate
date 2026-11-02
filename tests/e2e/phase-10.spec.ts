import { expect, type Locator, test } from "@playwright/test";

import { correctTime, pausedBadge } from "./utils/play-screen";
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
 * A ladder climbed manche by manche (Phase 10, full-suite only — untagged),
 * on a two-phase copy of the game so the climb fits in two manches.
 *
 * Each manche the table writes down the points left in each hand and ticks the
 * phase of whoever laid his down; it counts the laps as it goes. The climb
 * decides the game — the first to clear the last phase takes it, whatever the
 * others' points — and the end screen draws the climb and the laps.
 */

/** The box a player ticks once he laid his phase down. */
function phaseBox(prompt: Locator, name: string): Locator {
  return prompt
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("button", { name: /réalisée/ });
}

/** A two-player table sat at a laddered copy of Phase 10. */
interface LadderTable {
  admin: ReturnType<typeof adminClient>;
  party: string;
  first: string;
  second: string;
  idOf: (name: string) => string;
}

/**
 * Seeds a copy of the game — its ladder's `steps`, points by fives — and a
 * party of two at manche `stage`, plays `play` at that table, then clears it
 * all away. `timed` adds the manche stopwatch; `scoring` and `ladder` add to
 * the game's own.
 */
async function atLadderTable(
  setup: Readonly<{
    name: string;
    steps: string[];
    stage?: number;
    timed?: boolean;
    scoring?: Readonly<Record<string, unknown>>;
    ladder?: Readonly<Record<string, unknown>>;
  }>,
  play: (table: LadderTable) => Promise<void>,
): Promise<void> {
  const admin = adminClient();
  const players = await seedPlayers(2);
  const games: string[] = [];
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, {
      name: `${setup.name} ${Date.now().toString(36)}`,
      minPlayers: 2,
      isTimed: setup.timed === true,
      scoring: {
        timing: "final",
        entry: "total",
        winCondition: { type: "lowest" },
        trackRecords: false,
        ...setup.scoring,
      },
      stages: {
        label: "Manche",
        advance: "manual",
        pointsStep: 5,
        ladder: { label: "Phase", steps: setup.steps, ...setup.ladder },
      },
      ...(setup.timed === true
        ? {
            phases: [
              {
                key: "manche",
                label: "Manche",
                mode: "simultaneous",
                clock: "stopwatch",
              },
            ],
          }
        : {}),
    });

    const idOf = await playerIds(players);
    const party = await seedParty(
      admin,
      bgId,
      players.map(name => ({ playerId: idOf(name), score: null })),
      { ongoing: true, stage: setup.stage ?? 1 },
    );

    games.push(party);
    await play({ admin, party, first: players[0], second: players[1], idOf });
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [bgId],
      playerNames: players,
    });
  }
}

/** Who the party was recorded as won by, as soon as it is. */
async function winnersOf(
  admin: ReturnType<typeof adminClient>,
  party: string,
): Promise<string[]> {
  const { data } = await admin
    .from("game_players")
    .select("player_id")
    .eq("game_id", party)
    .eq("is_winner", true);

  return (data ?? []).map(r => r.player_id as string);
}

test("climbs the phases, counts the laps and settles the top on points", async ({
  page,
}) => {
  await atLadderTable(
    {
      name: "E2E Phase",
      steps: ["2 triplés", "1 triplé + 1 suite de 4"],
      timed: true,
      scoring: { extraRecords: ["heaviestStage", "lowestWin"] },
    },
    async ({ admin, party, first, second, idOf }) => {
      await page.goto(`/games/${party}/play`);

      await expect(
        page.getByText(
          "Le premier à réaliser la phase 2 gagne ; à égalité, le plus petit total.",
        ),
      ).toBeVisible();

      // The manche runs a table stopwatch, corrected like the turn timer when
      // somebody forgot it: held still, then set to 5:00 and nudged to 5:30.
      await page.getByRole("button", { name: "Mettre en pause" }).click();
      await expect(pausedBadge(page)).toBeVisible();
      await correctTime(page, {
        sheet: "Corriger le temps écoulé",
        field: "Temps écoulé",
        typed: "5:00",
        step: "Ajouter 30 s",
        expected: "5:30",
      });

      // The laps are counted as they go round.
      await expect(page.getByTestId("lap-count")).toHaveText("Tour 1");
      await page.getByRole("button", { name: "Tour suivant" }).click();
      await expect(page.getByTestId("lap-count")).toHaveText("Tour 2");

      // Manche 1: the first player goes out, so his phase is down; the second
      // laid his too, with 25 points still in hand.
      await page.getByRole("button", { name: "Fin de la manche 1 →" }).click();

      const one = page.getByRole("dialog", { name: "Points de la manche 1" });

      await stagePoints(one, second).fill("25");
      await expect(
        one.getByText("Celui qui finit la manche a forcément posé sa phase."),
      ).toBeVisible();

      await phaseBox(one, first).click();
      await phaseBox(one, second).click();
      await expect(phaseBox(one, first)).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      // Points come by fives: an odd total is a miscount.
      await stagePoints(one, second).fill("22");
      await expect(
        one.getByText("Les points d'une manche vont de 5 en 5."),
      ).toBeVisible();
      await stagePoints(one, second).fill("25");
      await one.getByRole("button", { name: "Valider" }).click();

      const recapOne = page.getByRole("dialog", { name: "Fin de la manche 1" });

      await expect(recapOne.getByTestId("ladder-standing")).toHaveCount(2);
      await expect(recapOne.getByText("Phase 2", { exact: true })).toHaveCount(
        2,
      );
      await recapOne.getByRole("button", { name: "Manche 2" }).click();

      // The manche's laps and its corrected time were banked when it was written
      // down.
      await expect
        .poll(async () => {
          const { data } = await admin
            .from("game_phases")
            .select("laps, duration_s")
            .eq("game_id", party)
            .eq("stage", 1)
            .single();

          return [data?.laps, data?.duration_s];
        })
        .toEqual([2, 330]);

      // The manches so far, one by one: the points of each, and « P1 » next to
      // whoever laid his first phase down in it.
      await page
        .getByRole("button", { name: "Afficher le détail des scores" })
        .click();

      const detail = page.getByTestId("stage-detail");

      await expect(detail.getByText("P1", { exact: true })).toHaveCount(2);
      await expect(detail).toContainText("25");

      // Manche 2: the second player goes out on 0 — but it is the first who
      // clears the last phase, and the climb decides, not the points.
      await expect(page.getByTestId("lap-count")).toHaveText("Tour 1");
      await page.getByRole("button", { name: "Fin de la manche 2 →" }).click();

      const two = page.getByRole("dialog", { name: "Points de la manche 2" });

      await stagePoints(two, first).fill("50");
      await phaseBox(two, first).click();
      await phaseBox(two, second).click();
      await two.getByRole("button", { name: "Valider" }).click();

      const recapTwo = page.getByRole("dialog", { name: "Fin de la manche 2" });

      // Both cleared the last phase: the fewest points among them wins — the
      // second, on 25 against 50.
      await expect(
        recapTwo.getByText("La phase 2 est réalisée : la partie s'arrête ici."),
      ).toBeVisible();
      await recapTwo
        .getByRole("button", { name: "Voir le classement" })
        .click();

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
          [idOf(first)]: [50, false],
          [idOf(second)]: [25, true],
        });

      // The finished game draws the climb and the laps of each manche.
      await page.goto(`/games/${party}/play`);

      await expect(page.getByTestId("ladder-chart")).toBeVisible();
      await expect(page.getByTestId("stage-laps")).toBeVisible();

      await page.getByRole("button", { name: "Voir le score final" }).click();
      await expect(page.getByText("2 phases réalisées")).toHaveCount(2);

      // The final score carries the same detail, manche 2's phases now tagged.
      await page
        .getByRole("button", { name: "Afficher le détail des scores" })
        .click();
      await expect(
        page.getByTestId("stage-detail").getByText("P2", { exact: true }),
      ).toHaveCount(2);
    },
  );
});

test("crowns the higher climb over the lower total", async ({ page }) => {
  await atLadderTable(
    { name: "E2E Phase seule", steps: ["2 triplés"] },
    async ({ admin, party, first, second, idOf }) => {
      await page.goto(`/games/${party}/play`);

      // Nothing timed here: no laps to count either.
      await expect(page.getByTestId("lap-count")).toHaveCount(0);

      await page.getByRole("button", { name: "Fin de la manche 1 →" }).click();

      const one = page.getByRole("dialog", { name: "Points de la manche 1" });

      // The first goes out on his phase; the second holds only 5 points but
      // never laid his down — the lower total, on the lower climb.
      await stagePoints(one, second).fill("5");
      await phaseBox(one, first).click();
      await one.getByRole("button", { name: "Valider" }).click();
      await page
        .getByRole("dialog", { name: "Fin de la manche 1" })
        .getByRole("button", { name: "Voir le classement" })
        .click();

      await expect.poll(() => winnersOf(admin, party)).toEqual([idOf(first)]);
    },
  );
});

test("stopped early, crowns the best climber rather than the lowest total", async ({
  page,
}) => {
  await atLadderTable(
    { name: "E2E Phase arrêt", steps: ["a", "b", "c"], stage: 2 },
    async ({ admin, party, first, second, idOf }) => {
      // Two manches in: the first has cleared two phases on 50 points, the
      // second one phase on 10.
      // Every row names every column: a bulk insert sends NULL, not the default,
      // for a column one row leaves out.
      await admin.from("game_stage_scores").insert([
        {
          game_id: party,
          stage: 1,
          player_id: idOf(first),
          points: 0,
          cleared: true,
        },
        {
          game_id: party,
          stage: 1,
          player_id: idOf(second),
          points: 10,
          cleared: false,
        },
        {
          game_id: party,
          stage: 2,
          player_id: idOf(first),
          points: 50,
          cleared: true,
        },
        {
          game_id: party,
          stage: 2,
          player_id: idOf(second),
          points: 0,
          cleared: true,
        },
      ]);

      await page.goto(`/games/${party}/play`);
      await page.getByRole("button", { name: "Terminer la partie" }).click();

      await expect.poll(() => winnersOf(admin, party)).toEqual([idOf(first)]);
    },
  );
});

test("holds a player without his phase to a whole hand at the end of a manche", async ({
  page,
}) => {
  await atLadderTable(
    { name: "E2E Phase main", steps: ["a", "b"], ladder: { unclearedMin: 50 } },
    async ({ party, first, second }) => {
      await page.goto(`/games/${party}/play`);
      await page.getByRole("button", { name: "Fin de la manche 1 →" }).click();

      const one = page.getByRole("dialog", { name: "Points de la manche 1" });

      // Nobody's phase is down yet: everybody holds ten cards, 50 at the least,
      // and the arrow can't take him under it.
      await expect(stagePoints(one, first)).toHaveValue("50");
      const down = one.getByRole("button", { name: `${first} : 5 de moins` });

      await expect(down).toBeDisabled();

      // Laying the phase frees him to go out.
      await phaseBox(one, first).click();
      await expect(down).toBeEnabled();
      await stagePoints(one, first).fill("0");

      // Typed under the floor, the entry is refused and says why.
      await stagePoints(one, second).fill("45");
      await expect(
        one.getByText(
          "Sans sa phase posée, on garde toutes ses cartes : au moins 50 points.",
        ),
      ).toBeVisible();

      // Unticking a phase brings the points back up to a whole hand.
      await phaseBox(one, second).click();
      await stagePoints(one, second).fill("10");
      await phaseBox(one, second).click();
      await expect(stagePoints(one, second)).toHaveValue("50");
      await expect(one.getByRole("button", { name: "Valider" })).toBeEnabled();
    },
  );
});
