import { expect, test } from "@playwright/test";

import {
  adminClient,
  seedPlayers,
  TERRAFORMING_MARS_ID,
} from "./utils/supabase";

const PLAYER_COUNT = 3;

/**
 * The milestones handed out during a Terraforming Mars game (full-suite only —
 * untagged): the left-edge panel gives one to a player, the claim survives a
 * reload because it went to the database, and taking the last one closes the
 * ones nobody took.
 */
test("gives out milestones from the game's left panel", async ({ page }) => {
  const admin = adminClient();
  const names = await seedPlayers(PLAYER_COUNT);
  let gameId = "";

  try {
    const { data: seeded } = await admin
      .from("players")
      .select("id, name")
      .in("name", names);
    const ids = names.map(
      n => (seeded ?? []).find(p => p.name === n)?.id as string,
    );

    const { data: game } = await admin
      .from("games")
      .insert({
        boardgame_id: TERRAFORMING_MARS_ID,
        status: "ongoing",
        round: 1,
        turn: 1,
        stage: 2,
        current_player_id: ids[0],
      })
      .select("id")
      .single();
    gameId = game?.id as string;

    await admin.from("game_players").insert(
      ids.map((player_id, i) => ({
        game_id: gameId,
        player_id,
        seat_order: i,
      })),
    );

    await page.goto(`/games/${gameId}/play`);
    await page.getByRole("button", { name: "Ouvrir les jalons" }).click();

    const panel = page.getByRole("dialog", { name: "Jalons" });

    await expect(panel).toBeVisible();
    await expect(panel.getByText("Terraformeur")).toBeVisible();
    await expect(panel.getByText("Encore 3 jalons à prendre")).toBeVisible();

    // The milestone is announced out loud and given in one tap on a name.
    const terraformeur = panel.getByRole("listitem").filter({
      hasText: "Terraformeur",
    });

    await terraformeur.getByRole("button", { name: names[0] }).click();

    await expect(terraformeur.getByText("+5")).toBeVisible();
    await expect(
      terraformeur.getByRole("button", { name: "Retirer" }),
    ).toBeVisible();
    await expect(panel.getByText("Encore 2 jalons à prendre")).toBeVisible();

    // The claim is stamped with the generation the game was in, not the lap.
    const { data: claims } = await admin
      .from("game_milestones")
      .select("milestone_key, player_id, stage")
      .eq("game_id", gameId);

    expect(claims).toHaveLength(1);
    expect(claims?.[0].milestone_key).toBe("terraformeur");
    expect(claims?.[0].player_id).toBe(ids[0]);
    expect(claims?.[0].stage).toBe(2);

    // Taking the last two closes the ones nobody took: the board only ever
    // gives out three.
    await panel
      .getByRole("listitem")
      .filter({ hasText: "Maire" })
      .getByRole("button", { name: names[1] })
      .click();
    await panel
      .getByRole("listitem")
      .filter({ hasText: "Jardinier" })
      .getByRole("button", { name: names[2] })
      .click();

    await expect(panel.getByText("Les 3 jalons ont été pris.")).toBeVisible();
    await expect(
      panel.getByText("Plus aucun jalon ne peut être pris."),
    ).toHaveCount(2);

    // It went to the database, not just to the screen: a reload finds it.
    await page.reload();
    await page.getByRole("button", { name: "Ouvrir les jalons" }).click();

    const reopened = page.getByRole("dialog", { name: "Jalons" });

    await expect(
      reopened
        .getByRole("listitem")
        .filter({ hasText: "Terraformeur" })
        .getByText(names[0]),
    ).toBeVisible();

    // Given to the wrong player, it can be taken back and handed over again.
    await reopened
      .getByRole("listitem")
      .filter({ hasText: "Terraformeur" })
      .getByRole("button", { name: "Retirer" })
      .click();

    await expect(reopened.getByText("Encore un jalon à prendre")).toBeVisible();

    await reopened.getByRole("button", { name: "Fermer" }).click();

    // What was tracked during the game is already on the scoresheet — filled
    // in, and editable like every other cell.
    await page.getByRole("button", { name: "Compter les points" }).click();

    const sheet = page.getByRole("dialog", { name: "Comptage des points" });

    await expect(sheet.getByLabel(`Jalons — ${names[1]}`)).toHaveValue("5");
    await expect(sheet.getByLabel(`Jalons — ${names[0]}`)).toHaveValue("");

    await sheet.getByLabel(`Jalons — ${names[1]}`).fill("10");

    await expect(sheet.getByLabel(`Jalons — ${names[1]}`)).toHaveValue("10");
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});
