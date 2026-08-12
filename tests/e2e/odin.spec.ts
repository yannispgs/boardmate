import { expect, test } from "@playwright/test";

import { stagePoints } from "./utils/stage-prompt";
import { adminClient, seedPlayers } from "./utils/supabase";

const PLAYER_COUNT = 3;

/**
 * A game counted manche by manche, in an unknown number of them (Odin,
 * full-suite only — untagged). Nothing is timed and nobody is « up »: the whole
 * screen is the tally and the one button that closes a manche. The game stops
 * itself when a total reaches the bar, and the smallest total takes it.
 */
test("counts Odin manche by manche and stops the game at the bar", async ({
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
      .eq("name", "Odin")
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

    // No countdown and nobody to hurry: the screen says what the table plays to.
    await expect(
      page.getByText(
        "La partie s'arrête dès que quelqu'un atteint 15 points : le plus petit total gagne.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tour suivant" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Fin de la manche 1 →" }).click();

    const first = page.getByRole("dialog", { name: "Points de la manche 1" });

    // A manche nobody went out of cannot have happened, so it can't be recorded.
    await stagePoints(first, names[0]).fill("2");
    await stagePoints(first, names[1]).fill("6");
    await stagePoints(first, names[2]).fill("3");

    await expect(
      first.getByText("Un seul joueur doit finir à 0 point."),
    ).toBeVisible();
    await expect(first.getByRole("button", { name: "Valider" })).toBeDisabled();

    await stagePoints(first, names[0]).fill("0");
    await first.getByRole("button", { name: "Valider" }).click();

    // The recap reads the totals out before anyone deals again.
    const recap = page.getByRole("dialog", { name: "Fin de la manche 1" });

    await expect(recap.getByText("Totaux après cette manche.")).toBeVisible();
    await recap.getByRole("button", { name: "Manche 2" }).click();

    await expect(page.getByText("Manche 2")).toBeVisible();

    // Second manche: the loser of the first crosses the bar, which stops it.
    await page.getByRole("button", { name: "Fin de la manche 2 →" }).click();

    const second = page.getByRole("dialog", { name: "Points de la manche 2" });

    await stagePoints(second, names[0]).fill("4");
    await stagePoints(second, names[1]).fill("9");
    await stagePoints(second, names[2]).fill("0");
    await second.getByRole("button", { name: "Valider" }).click();

    const last = page.getByRole("dialog", { name: "Fin de la manche 2" });

    await expect(
      last.getByText("La barre des 15 points est franchie"),
    ).toBeVisible();
    await last.getByRole("button", { name: "Voir le classement" }).click();

    // Totals: 4, 15, 3 — the game ends on the sums of the manches, with the
    // smallest total winning and nothing asked of the table a second time.
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
        [4, false],
        [15, false],
        [3, true],
      ]);

    const { data: ended } = await admin
      .from("games")
      .select("status")
      .eq("id", gameId)
      .single();

    expect(ended?.status).toBe("ended");
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", names);
  }
});
