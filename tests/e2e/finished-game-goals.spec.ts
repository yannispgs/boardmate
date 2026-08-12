import { expect, type Page, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

const PLAYER_COUNT = 2;

/** The tile picker of one manche, in the optional goal block. */
function stagePicker(page: Page, stage: number) {
  return page
    .getByRole("group")
    .getByRole("combobox")
    .nth(stage - 1);
}

/** One player's points cell for one manche, named after the tile it scored. */
function stageCell(page: Page, label: string, name: string) {
  return page.getByRole("spinbutton", { name: `${label} — ${name}` });
}

/**
 * Recording an already-finished Wingspan **with the detail of its manches**
 * (full-suite only — untagged): which goal tile scored each one, and what each
 * player took from it. It is optional and all-or-nothing, and once complete it
 * fills the sheet's « Objectifs de manche » line — which stays correctable.
 */
test("records the goal detail of a finished game, and fills the sheet from it", async ({
  page,
}) => {
  const names = await seedPlayers(PLAYER_COUNT);
  const admin = adminClient();
  const { data: seeded } = await admin
    .from("players")
    .select("id, name")
    .in("name", names);
  const ids = names.map(
    n => (seeded ?? []).find(p => p.name === n)?.id as string,
  );
  let gameId: string | undefined;

  try {
    await page.goto("/games/finished");

    await page.getByRole("button", { name: "Wingspan", exact: true }).click();

    // Oceania is what puts « Pas d'objectif » in the box and « Nectar » on the
    // sheet: a game played with it can only be recorded faithfully if it is said.
    await page.getByRole("checkbox", { name: /Océanie/ }).check();

    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
    }

    await page.getByText("Détail des objectifs de manche").click();

    // Nothing is recorded until the four tiles are down …
    await expect(
      page.getByText("Choisis l'objectif de chaque manche"),
    ).toBeVisible();

    await stagePicker(page, 1).selectOption({ label: "Oiseaux (total)" });
    await stagePicker(page, 2).selectOption({ label: "Séries de 3 œufs" });
    await stagePicker(page, 3).selectOption({ label: "Pas d'objectif" });
    await stagePicker(page, 4).selectOption({ label: "Œufs dans X" });
    await page.getByRole("button", { name: "Mer" }).click();

    // … nor until every cell of the grid carries a number.
    await expect(page.getByText("Encore 8 cases à remplir")).toBeVisible();

    const points: Record<string, number[]> = {
      [names[0]]: [4, 2, 0, 3],
      [names[1]]: [1, 5, 0, 0],
    };
    const labels = [
      "Manche 1 · Oiseaux (total)",
      "Manche 2 · Séries de 3 œufs",
      "Manche 3 · Pas d'objectif",
      "Manche 4 · Œufs dans Mer",
    ];

    for (const name of names) {
      for (const [i, label] of labels.entries()) {
        await stageCell(page, label, name).fill(String(points[name][i]));
      }
    }

    // « Pas d'objectif » on manche 3 lengthens the ones after it, and only them:
    // manche 3 still lasts its 6 laps, manche 4 gets 5 + 1.
    await expect(page.getByText("8 · 7 · 6 · 6 tours")).toBeVisible();

    // The sheet's own line is filled from the manches, and stays typeable: the
    // paper and the board can disagree, and the paper wins.
    await page.getByText("Détail par catégorie").click();

    // Exact: the manche lines of the block above carry the very same words
    // (« Manche 2 · Séries de 3 œufs — … » would match « Œufs — … »).
    const sheetLine = (line: string, name: string) =>
      page.getByRole("spinbutton", { name: `${line} — ${name}`, exact: true });
    const goalsLine = (name: string) => sheetLine("Objectifs de manche", name);

    await expect(goalsLine(names[0])).toHaveValue("9");
    await expect(goalsLine(names[1])).toHaveValue("6");

    await goalsLine(names[1]).fill("7");

    // Oceania's own line is on the sheet, which it would not be without it.
    await expect(sheetLine("Nectar", names[0])).toBeVisible();

    // The rest of the sheet, so the totals can be worked out.
    for (const name of names) {
      for (const line of [
        "Oiseaux",
        "Œufs",
        "Cartes objectif",
        "Jetons nourriture stockés",
        "Cartes recouvertes",
        "Nectar",
      ]) {
        await sheetLine(line, name).fill("5");
      }
    }

    await page.getByRole("button", { name: "Enregistrer la partie" }).click();

    await expect(page).toHaveURL(/\/games$/);

    // The manches reached the database, tiles and points, exactly as a game
    // played in the app would have left them.
    const { data: gps } = await admin
      .from("game_players")
      .select("game_id, score_breakdown, player_id")
      .in("player_id", ids);
    gameId = (gps ?? [])[0]?.game_id as string;

    const { data: stages } = await admin
      .from("game_stages")
      .select("stage, goal_key, goal_params, turns")
      .eq("game_id", gameId)
      .order("stage");

    expect(stages).toEqual([
      { stage: 1, goal_key: "totalBirds", goal_params: {}, turns: 8 },
      { stage: 2, goal_key: "eggSets", goal_params: {}, turns: 7 },
      { stage: 3, goal_key: "noGoal", goal_params: {}, turns: 6 },
      {
        stage: 4,
        goal_key: "eggsInHabitat",
        goal_params: { habitat: "sea" },
        turns: 6,
      },
    ]);

    const { data: scores } = await admin
      .from("game_stage_scores")
      .select("stage, player_id, points")
      .eq("game_id", gameId)
      .eq("player_id", ids[0])
      .order("stage");

    expect((scores ?? []).map(s => s.points)).toEqual([4, 2, 0, 3]);

    // The corrected line is the one kept, not the sum the manches implied.
    const breakdown = (gps ?? []).find(g => g.player_id === ids[1])
      ?.score_breakdown as Record<string, number>;

    expect(breakdown.objectifsManche).toBe(7);

    // Recorded with Oceania, which is what made its tile and its line legal.
    const { data: exts } = await admin
      .from("game_extensions")
      .select("extension_id")
      .eq("game_id", gameId);

    expect(exts).toHaveLength(1);
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});
