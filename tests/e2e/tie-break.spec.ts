import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * Games that end level, and the two places the table gets asked to separate the
 * leaders (full-suite only — untagged).
 *
 * Where the app adds the points up itself, the ex æquo is news: it must stay
 * secret until the reveal climbs to the place the leaders share, and the game's
 * own rule is asked for there. Where the table typed the totals in, it already
 * knows — there is no reveal at all, so the prompt opens over the score form
 * instead. Nothing is recorded before the leaders are separated, either way.
 */

/** The secondary rule both games are given, asked at the end. */
const JETONS = { key: "jetons", label: "Le plus de jetons", source: "ask" };

test("keeps a tie for the win secret until the reveal reaches it", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Tie ${Date.now().toString(36)}`;
  let boardgameId: string | null = null;
  let gameId: string | null = null;

  try {
    // Scored on a sheet the app totals itself, so the standings are the app's
    // to announce — hence the reveal.
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
              entry: "categories",
              winCondition: { type: "highest" },
              sheet: [
                { key: "points", label: "Points" },
                { key: "bonus", label: "Bonus" },
              ],
              tieBreak: [JETONS],
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
    await page.getByRole("button", { name: "Compter les points" }).click();
    for (const name of players) {
      await page.getByLabel(`Bonus — ${name}`).fill("0");
    }
    await page.getByLabel(`Points — ${players[0]}`).fill("10");
    await page.getByLabel(`Points — ${players[1]}`).fill("10");
    await page.getByLabel(`Points — ${players[2]}`).fill("4");

    // The sheet crowns nobody: it holds lines, not standings.
    await expect(page.getByText("🏆")).toHaveCount(0);
    await page.getByRole("button", { name: "Total final" }).click();

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

test("settles a tie over the score form when the table typed the totals", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Typed ${Date.now().toString(36)}`;
  let boardgameId: string | null = null;
  let gameId: string | null = null;

  try {
    // Totals typed in at the end: the table counted, so it already knows.
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
              tieBreak: [JETONS],
            },
          })
          .select("id")
          .single()
      ).data?.id ?? null;

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

    await page.getByRole("button", { name: "Terminer la partie" }).click();
    await page.getByLabel(`Score de ${players[0]}`).fill("10");
    await page.getByLabel(`Score de ${players[1]}`).fill("10");
    await page.getByLabel(`Score de ${players[2]}`).fill("4");

    // A party of this game is a whole evening, not one deal: it is timed, so
    // the form does not offer to deal the next one.
    await expect(
      page.getByRole("button", { name: "Enchaîner une nouvelle partie" }),
    ).toHaveCount(0);

    // Level leaders are left uncrowned — the form proposes a lone leader only.
    await expect(page.getByText("🏆")).toHaveCount(0);
    await page.getByRole("button", { name: "Terminer", exact: true }).click();

    // No reveal to open the prompt from: it opens over the form, and nothing is
    // recorded until the leaders are separated.
    await expect(page.getByText("Classement final")).toHaveCount(0);

    const prompt = page.getByRole("dialog");

    await expect(prompt).toBeVisible();

    const { data: pending } = await admin
      .from("games")
      .select("status")
      .eq("id", gameId)
      .single();

    expect(pending?.status).toBe("ongoing");

    await page.getByLabel(`Le plus de jetons — ${players[1]}`).fill("5");
    await page.getByLabel(`Le plus de jetons — ${players[0]}`).fill("2");
    await prompt.getByRole("button", { name: "Départager" }).click();
    await prompt.getByRole("button", { name: "Terminer" }).click();

    // The party goes straight into the books, exactly as a lone leader would
    // have — still no reveal.
    await expect(page.getByText("Partie terminée")).toBeVisible();
    await expect(page.getByText("Classement final")).toHaveCount(0);

    const { data: ended } = await admin
      .from("games")
      .select("status, tie_break")
      .eq("id", gameId)
      .single();

    expect(ended?.status).toBe("ended");
    expect(ended?.tie_break?.shared).toBe(false);

    const { data: recorded } = await admin
      .from("game_players")
      .select("score, is_winner")
      .eq("game_id", gameId as string)
      .order("seat_order");

    expect((recorded ?? []).map(r => [r.score, r.is_winner])).toEqual([
      [10, false],
      [10, true],
      [4, false],
    ]);
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
