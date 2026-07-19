import { expect, test } from "@playwright/test";

import { adminClient, CATAN_NAME, seedPlayers } from "./utils/supabase";

/**
 * Selecting a Catan extension + scenario in the launch recap (full-suite only —
 * untagged). The scenario imposes a fixed, read-only win target, and the game is
 * recorded with its active extension + scenario.
 */
test("launches a Catan game with the Marins extension and a scenario", async ({
  page,
}) => {
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
