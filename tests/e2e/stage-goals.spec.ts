import { expect, type Locator, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

const PLAYER_COUNT = 2;

/**
 * A game played on a calendar of manches (Wingspan, full-suite only —
 * untagged): each manche is closed by entering what its goal tile paid, and
 * what was entered along the way is already on the end-of-game sheet, as a line
 * nobody has to fill in again. Océanie is active, so the sheet also carries the
 * nectar line the extension adds.
 *
 * The calendar is seeded one lap per manche: the journey is about closing a
 * manche, not about sitting through the sixteen turns Wingspan really lasts.
 */
test("scores each manche's goal and carries the total to the sheet", async ({
  page,
}) => {
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

    const { data: boardgame } = await admin
      .from("boardgames")
      .select("id")
      .eq("name", "Wingspan")
      .single();
    const { data: extension } = await admin
      .from("extensions")
      .select("id")
      .eq("name", "Wingspan - Océanie")
      .single();

    // Sat down at the last turn of the first manche, so the button that closes
    // it is the first thing on screen.
    const { data: game } = await admin
      .from("games")
      .insert({
        boardgame_id: boardgame?.id as string,
        status: "ongoing",
        round: 1,
        turn: 2,
        stage: 1,
        current_player_id: ids[1],
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
    await admin.from("game_extensions").insert({
      game_id: gameId,
      extension_id: extension?.id as string,
    });
    await admin.from("game_stages").insert([
      {
        game_id: gameId,
        stage: 1,
        goal_key: "eggsInHabitat",
        goal_params: { habitat: "sea" },
        turns: 1,
      },
      {
        game_id: gameId,
        stage: 2,
        goal_key: "birdsInHabitat",
        goal_params: { habitat: "forest" },
        turns: 1,
      },
    ]);

    await page.goto(`/games/${gameId}/play`);

    // The manche's own goal is read out, so nobody has to remember which tile
    // was laid on it.
    await page.getByRole("button", { name: "Fin de la manche →" }).click();

    const first = page.getByRole("dialog", { name: "Objectif de la manche 1" });

    await expect(first.getByText("Objectif : Œufs dans Mer")).toBeVisible();

    await goalPoints(first, names[0]).fill("4");
    await goalPoints(first, names[1]).fill("2");
    await first.getByRole("button", { name: "Manche suivante" }).click();

    // The table moved on: the next manche is up, with its own tile.
    await expect(page.getByText("Manche 2 · Tour 1")).toBeVisible();

    // The last manche has no « suivante » to move on to, so its goal is noted
    // on its own, next to the invitation to end the game.
    await page.getByRole("button", { name: "Tour suivant" }).click();
    await page
      .getByRole("button", { name: "Noter l'objectif de la manche" })
      .click();

    const second = page.getByRole("dialog", {
      name: "Objectif de la manche 2",
    });

    await expect(
      second.getByText("Objectif : Oiseaux dans Forêt"),
    ).toBeVisible();

    await goalPoints(second, names[0]).fill("3");
    await goalPoints(second, names[1]).fill("5");
    await second.getByRole("button", { name: "Enregistrer" }).click();

    // Both manches went to the database, one row per player per manche.
    await expect
      .poll(async () => {
        const { data } = await admin
          .from("game_stage_scores")
          .select("stage, player_id, points")
          .eq("game_id", gameId)
          .order("stage");

        return data ?? [];
      })
      .toHaveLength(4);

    // The sheet already knows what the manches paid — added up, and not asked
    // for a second time. Nectar is there too, because Océanie is on the table.
    await page.getByRole("button", { name: "Compter les points" }).click();

    const sheet = page.getByRole("dialog", { name: "Comptage des points" });
    const total = sheet.getByLabel(`Objectifs de manche — ${names[0]}`);

    await expect(total).toHaveValue("7");
    await expect(total).toHaveAttribute("readonly", "");
    await expect(
      sheet.getByLabel(`Objectifs de manche — ${names[1]}`),
    ).toHaveValue("7");
    await expect(sheet.getByLabel(`Nectar — ${names[0]}`)).toHaveValue("");
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});

/** One player's points box in the end-of-manche prompt (the rows carry no label). */
function goalPoints(prompt: Locator, name: string): Locator {
  return prompt
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("spinbutton");
}
