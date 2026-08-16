import { expect, test } from "@playwright/test";

import { stagePoints } from "./utils/stage-prompt";
import { adminClient, seedPlayers } from "./utils/supabase";

const PLAYER_COUNT = 3;

/**
 * A trick-taking game counted manche by manche, over a number of manches fixed
 * by the table (Papayoo, full-suite only — untagged). Nothing is timed, nobody
 * goes out, and the twenty payoos plus the papayoo card put exactly 250 points
 * on the table every manche — so the form refuses anything that doesn't add up,
 * and the game stops itself once everybody has named the payoo suit once.
 */
test("counts Papayoo to 250 a manche and stops it after one manche each", async ({
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
      .eq("name", "Papayoo")
      .single();

    const { data: game } = await admin
      .from("games")
      .insert({
        boardgame_id: boardgame?.id as string,
        status: "ongoing",
        round: 1,
        turn: 1,
        stage: 1,
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

    // Three players, three manches: the length is the table's, not a score's.
    await expect(
      page.getByText(
        "La partie se joue en 3 manches : le plus petit total gagne.",
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Fin de la manche 1 / 3" }).click();

    const first = page.getByRole("dialog", { name: "Points de la manche 1" });

    await expect(
      first.getByText(
        "Points de chacun : le total de la manche doit faire 250.",
      ),
    ).toBeVisible();

    // The complaint doubles as the running count while the boxes fill up.
    await expect(
      first.getByText(
        "Le total de la manche doit faire 250 points (actuellement 0).",
      ),
    ).toBeVisible();

    await stagePoints(first, names[0]).fill("100");
    await stagePoints(first, names[1]).fill("100");
    await stagePoints(first, names[2]).fill("100");

    await expect(
      first.getByText(
        "Le total de la manche doit faire 250 points (actuellement 300).",
      ),
    ).toBeVisible();
    await expect(first.getByRole("button", { name: "Valider" })).toBeDisabled();

    await stagePoints(first, names[2]).fill("50");
    await first.getByRole("button", { name: "Valider" }).click();

    const recap = page.getByRole("dialog", { name: "Fin de la manche 1" });

    await expect(recap.getByText("Totaux après cette manche.")).toBeVisible();
    await recap.getByRole("button", { name: "Manche 2" }).click();

    // Second manche: one player collects the lot, so two of them end at 0 —
    // which no rule of this game forbids, unlike Odin's single sortie.
    await page.getByRole("button", { name: "Fin de la manche 2 / 3" }).click();

    const second = page.getByRole("dialog", { name: "Points de la manche 2" });

    await stagePoints(second, names[0]).fill("250");

    await expect(second.getByRole("button", { name: "Valider" })).toBeEnabled();

    await second.getByRole("button", { name: "Valider" }).click();
    await page
      .getByRole("dialog", { name: "Fin de la manche 2" })
      .getByRole("button", { name: "Manche 3" })
      .click();

    // Third and last: the recap says why the game stops rather than offering a
    // fourth deal nobody would play.
    await page.getByRole("button", { name: "Fin de la manche 3 / 3" }).click();

    const third = page.getByRole("dialog", { name: "Points de la manche 3" });

    await stagePoints(third, names[1]).fill("125");
    await stagePoints(third, names[2]).fill("125");
    await third.getByRole("button", { name: "Valider" }).click();

    const last = page.getByRole("dialog", { name: "Fin de la manche 3" });

    await expect(
      last.getByText("La manche 3 était la dernière : la partie s'arrête ici."),
    ).toBeVisible();
    await last.getByRole("button", { name: "Voir le classement" }).click();

    // Totals: 350, 225, 175 — the smallest pile of payoos takes it.
    await expect
      .poll(async () => {
        const { data } = await admin
          .from("game_players")
          .select("player_id, score, is_winner")
          .eq("game_id", gameId)
          .order("seat_order");

        return (data ?? []).map(r => [r.score, r.is_winner]);
      })
      .toEqual([
        [350, false],
        [225, false],
        [175, true],
      ]);

    // The end-of-game panel counts the manches nobody paid for, and calls them
    // what they are here: no sortie was ever made.
    await page.goto(`/games/${gameId}/play`);

    await expect(page.getByText("Statistiques de la partie")).toBeVisible();
    await expect(page.getByText("Temps de jeu")).toHaveCount(0);
    await expect(page.getByText("Qui finit le plus souvent à 0")).toBeVisible();
    await expect(page.getByText("sortie")).toHaveCount(0);
    await expect(page.getByText("La ligne jaune")).toHaveCount(0);
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});
