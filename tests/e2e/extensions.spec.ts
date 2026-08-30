import { expect, test } from "@playwright/test";

import {
  adminClient,
  CATAN_NAME,
  deleteScenarios,
  seedMarinsScenario,
  seedPlayers,
} from "./utils/supabase";

/**
 * Selecting a Catan extension + scenario in the launch recap. The scenario
 * imposes a fixed, read-only win target, and the game is recorded with its
 * active extension + scenario.
 *
 * Gating: an extension silently dropped on launch is a game played under the
 * wrong rules, and nothing later in the app can tell — so this one runs per-PR
 * rather than only in the full sweep.
 */
test("launches a Catan game with the Marins extension and a scenario", {
  tag: "@critical",
}, async ({ page }) => {
  const names = await seedPlayers(3);
  const admin = adminClient();
  let gameId: string | undefined;

  try {
    await page.goto("/games/new");
    await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();
    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Continuer →" }).click();

    // The recap offers the Catan extensions; enable Marins and pick a scenario.
    await page.getByRole("checkbox", { name: "Catan - Marins" }).check();
    await page.getByRole("radio", { name: /Les quatre îles/ }).check();

    // The scenario imposes a read-only target (Four Islands = 13).
    await expect(page.getByText(/Imposé par le scénario/)).toBeVisible();
    await expect(page.getByText("13", { exact: true })).toBeVisible();

    // The scenario owns the board but ships no map, so the funnel skips the
    // board step rather than drawing one under the wrong rules.
    await page.getByRole("button", { name: "Lancer la partie" }).click();
    await page.getByRole("button", { name: "Lancer", exact: true }).click();

    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1];

    // The game recorded the active extension + scenario.
    const { data: rows } = await admin
      .from("game_extensions")
      .select("scenario_id, extensions(name)")
      .eq("game_id", gameId ?? "");

    expect(rows?.length).toBe(1);
    expect((rows?.[0]?.extensions as unknown as { name: string })?.name).toBe(
      "Catan - Marins",
    );
    expect(rows?.[0]?.scenario_id).not.toBeNull();
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});

/**
 * Browsing a game's extensions from the "Jeux" list: the row opens the game,
 * and its extensions are one of the game's tabs — which lists what each
 * extension changes and each of its scenarios with the fixed score to reach.
 */
test("browses the Catan extensions from the games list", async ({ page }) => {
  await page.goto("/boardgames");
  await page.getByRole("link", { name: CATAN_NAME, exact: true }).click();
  await page.getByRole("link", { name: "Extensions", exact: true }).click();

  await expect(page).toHaveURL(/\/boardgames\/[0-9a-f-]+\/extensions/);
  await expect(
    page.getByRole("heading", { name: CATAN_NAME, level: 1 }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Catan - Marins" }),
  ).toBeVisible();
  await expect(page.getByText("2 scénarios au choix")).toBeVisible();
  await expect(page.getByText("Modifie le plateau")).toBeVisible();

  // Marins is authored in the app, so its scenarios come with the editor: each
  // row still carries the rulebook target (Four Islands = 13).
  const fourIslands = page
    .getByRole("listitem")
    .filter({ hasText: "Les quatre îles" });

  await expect(fourIslands).toBeVisible();
  await expect(fourIslands).toContainText("🎯 13");
});

/**
 * Previewing the scenario boards from the launch recap (full-suite only —
 * untagged): the carousel draws each scenario for the players already seated,
 * and picking one there ticks it in the form.
 */
test("previews the scenario boards before launching", async ({ page }) => {
  const names = await seedPlayers(3);
  const scenario = "E2E aperçu";

  await seedMarinsScenario(scenario);
  try {
    await page.goto("/games/new");
    await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();
    for (const name of names) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Continuer →" }).click();

    await page.getByRole("checkbox", { name: "Catan - Marins" }).check();
    await page.getByRole("button", { name: /Voir les plateaux/ }).click();

    const dialog = page.getByRole("dialog");
    const heading = dialog.getByRole("heading", { name: scenario });

    await expect(dialog).toBeVisible();

    // The carousel loops, so stepping through it reaches the seeded scenario
    // wherever the list happens to put it.
    while (!(await heading.isVisible())) {
      await dialog.getByRole("button", { name: "Plateau suivant" }).click();
    }

    await expect(dialog.locator("svg")).toBeVisible();

    // Choosing in the carousel closes it and answers the form behind it.
    await dialog.getByRole("button", { name: "Choisir ce scénario" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("radio", { name: new RegExp(scenario) }),
    ).toBeChecked();
    await expect(page.getByText(/Imposé par le scénario/)).toBeVisible();
  } finally {
    await deleteScenarios([scenario]);
    await adminClient().from("players").delete().in("name", names);
  }
});
