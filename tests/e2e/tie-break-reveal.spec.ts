import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * A game that ends level (full-suite only — untagged): the ex æquo must stay
 * secret until the reveal climbs to the place the leaders share. The score form
 * crowns nobody, the reveal announces the tie only on its last step, and the
 * game's own rule is asked for there — nothing is recorded before.
 */
test("keeps a tie for the win secret until the reveal reaches it", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Tie ${Date.now().toString(36)}`;
  let boardgameId: string | null = null;
  let gameId: string | null = null;

  try {
    // Scored on a final total, with one secondary rule the table has to answer.
    boardgameId =
      (
        await admin
          .from("boardgames")
          .insert({
            name: gameName,
            min_players: 1,
            max_players: 4,
            round_limit: null,
            scoring: {
              timing: "final",
              entry: "total",
              winCondition: { type: "highest" },
              tieBreak: [
                {
                  key: "jetons",
                  label: "Le plus de jetons",
                  source: "ask",
                },
              ],
            },
          })
          .select("id")
          .single()
      ).data?.id ?? null;

    // Funnel: our game, no config, all three players.
    await page.goto("/games/new");
    await page.getByRole("button", { name: gameName, exact: true }).click();
    await page
      .getByRole("button", { name: "Sans configuration", exact: true })
      .click();
    for (const name of players) {
      await page.getByRole("button", { name, exact: true }).click();
    }
    await page.getByRole("button", { name: "Continuer →" }).click();
    await page.getByRole("button", { name: "Lancer la partie" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Lancer", exact: true })
      .click();

    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? null;

    // Two players finish level in the lead, the third trails.
    await page.getByRole("button", { name: "Terminer la partie" }).click();
    await page.getByLabel(`Score de ${players[0]}`).fill("10");
    await page.getByLabel(`Score de ${players[1]}`).fill("10");
    await page.getByLabel(`Score de ${players[2]}`).fill("4");

    // The form crowns nobody: a lone leader would get the trophy, level ones
    // must not — that would give the ex æquo away before the reveal.
    await expect(page.getByText("🏆")).toHaveCount(0);
    await page.getByRole("button", { name: "Terminer", exact: true }).click();

    // The reveal opens empty, then uncovers the last place only.
    await expect(page.getByText("Classement final")).toBeVisible();
    await page.getByRole("button", { name: "Afficher" }).click();
    await expect(page.getByText(`3ᵉ place · ${players[2]}`)).toBeVisible();
    await expect(page.getByText(/Égalité/)).toHaveCount(0);

    // Next step is the shared first place: the tie surfaces here, and only here.
    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(page.getByText(/Égalité/)).toBeVisible();
    await expect(page.getByText("🏆", { exact: false })).toHaveCount(0);

    // The game's own rule is applied from the reveal itself.
    await page.getByRole("button", { name: "Départager" }).click();

    // The prompt sits on top of the reveal, so its own controls are scoped to it.
    const prompt = page.getByRole("dialog");

    await page.getByLabel(`Le plus de jetons — ${players[1]}`).fill("5");
    await page.getByLabel(`Le plus de jetons — ${players[0]}`).fill("2");
    await prompt.getByRole("button", { name: "Départager" }).click();
    await prompt.getByRole("button", { name: "Terminer" }).click();

    // Back on the reveal, the winner is crowned and the game is recorded.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Voir les scores" }).click();

    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    await expect(page.getByText(players[1]).first()).toBeVisible();

    const { data: ended } = await admin
      .from("games")
      .select("status, tie_break")
      .eq("id", gameId)
      .single();

    expect(ended?.status).toBe("ended");
    expect(ended?.tie_break?.shared).toBe(false);
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    if (boardgameId) {
      await admin.from("boardgames").delete().eq("id", boardgameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
