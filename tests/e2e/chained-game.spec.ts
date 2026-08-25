import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * An evening of short parties (Papayoo, full-suite only — untagged). A deal
 * lasts a quarter of an hour and the night is a dozen of them, so the score
 * form deals the next one itself: the table types its totals, presses
 * « Enchaîner une nouvelle partie », and lands on a fresh party with the same
 * players in the same seats — without walking back through « Parties » and the
 * creation funnel.
 */
test("deals the next party from the score form, same table, same seats", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const games: string[] = [];

  try {
    await page.goto("/games/new");
    await page.getByRole("button", { name: "Papayoo", exact: true }).click();
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
    const first = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? "";

    games.push(first);

    // First deal, counted and handed in — but the table is staying put.
    await page.getByRole("button", { name: "Entrer les scores" }).click();
    await page.getByLabel(`Score de ${players[0]}`).fill("100");
    await page.getByLabel(`Score de ${players[1]}`).fill("150");
    await page.getByLabel(`Score de ${players[2]}`).fill("0");

    // Dealing again is what an evening does nearly every time and packing up is
    // the exception, so « Enchaîner » leads and « Terminer la session » follows.
    await expect(
      page.locator("button", {
        hasText: /^(Enchaîner une nouvelle partie|Terminer la session)$/,
      }),
    ).toHaveText(["Enchaîner une nouvelle partie", "Terminer la session"]);

    await page
      .getByRole("button", { name: "Enchaîner une nouvelle partie" })
      .click();

    // The screen moves to another party, not back to the list.
    await expect(page).not.toHaveURL(new RegExp(`/games/${first}/play$`));
    await expect(page).toHaveURL(/\/games\/[0-9a-f-]+\/play$/);
    const second = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? "";

    games.push(second);

    // Nothing to fill in and nothing carried over: the new deal starts blank,
    // ready for its own scores.
    await expect(
      page.getByRole("button", { name: "Entrer les scores" }),
    ).toBeVisible();

    // The evening now says where it is, which the first deal could not.
    await expect(page.getByText("2ᵉ partie de la soirée")).toBeVisible();

    // And how it is going — recomputed from the deals sharing this session,
    // nothing about the evening being stored.
    await expect(
      page.getByText("Cette soirée — 1 partie terminée"),
    ).toBeVisible();

    const sitting = page.getByRole("list", {
      name: "Classement de la soirée",
    });
    const rows = sitting.getByRole("listitem");

    // The smallest pile takes the deal, so the winner leads the evening.
    await expect(rows.first()).toContainText(players[2]);
    // Nought points, first place — averages over the one deal played.
    await expect(rows.first()).toContainText("0.0");
    await expect(rows.first()).toContainText("1.0");
    await expect(rows).toHaveCount(3);

    // Nothing is timed here, so no turn is ever recorded: the button that used
    // to open on « après le premier tour joué » all evening is gone.
    await expect(
      page.getByRole("button", { name: "Ouvrir les statistiques" }),
    ).toHaveCount(0);

    const { data: statuses } = await admin
      .from("games")
      .select("id, status, session_id")
      .in("id", games);
    const byId = new Map((statuses ?? []).map(g => [g.id, g.status]));

    expect(byId.get(first)).toBe("ended");
    expect(byId.get(second)).toBe("ongoing");

    // Both deals belong to the same evening, which is what folds them into a
    // single row of « Parties » once they are both over.
    const sessions = new Set((statuses ?? []).map(g => g.session_id));

    expect(sessions.size).toBe(1);

    // The first deal kept its scores; the second sits the same table back down
    // in the same seats, with nothing written yet.
    const seats = async (gameId: string) => {
      const { data } = await admin
        .from("game_players")
        .select("score, players(name)")
        .eq("game_id", gameId)
        .order("seat_order");

      return (data ?? []).map(row => ({
        name: (row.players as unknown as { name: string }).name,
        score: row.score,
      }));
    };

    expect(await seats(first)).toEqual([
      { name: players[0], score: 100 },
      { name: players[1], score: 150 },
      { name: players[2], score: 0 },
    ]);
    expect(await seats(second)).toEqual([
      { name: players[0], score: null },
      { name: players[1], score: null },
      { name: players[2], score: null },
    ]);
  } finally {
    for (const gameId of games) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
