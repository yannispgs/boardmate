import { expect, test } from "@playwright/test";

import {
  adminClient,
  dropSeeded,
  playerIds,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/**
 * An evening of short parties (Papayoo, full-suite only — untagged). A deal
 * lasts a quarter of an hour and the night is a dozen of them, so the finished
 * party offers the next one: the table types its totals, hands the deal in,
 * presses « Enchaîner une nouvelle partie » on the end screen, and lands on a
 * fresh party with the same players in the same seats — without walking back
 * through « Parties » and the creation funnel.
 *
 * The offer comes from the boardgame (`is_chainable`), not from the way the
 * game happens to be scored, so any game can be played deal after deal from the
 * editor alone.
 */
test("deals the next party from the end screen, same table, same seats", async ({
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

    // The form has one button again: handing the deal in is all it does, and
    // where the evening goes next is asked on the screen that follows.
    await page.getByRole("button", { name: "Terminer", exact: true }).click();

    await expect(page.getByText("Partie terminée !")).toBeVisible();

    // Dealing again is what an evening does nearly every time and packing up is
    // the exception, so « Enchaîner » is the filled button and leaving is the
    // outlined one below it.
    await expect(
      page.getByRole("button", { name: "Enchaîner une nouvelle partie" }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Retour aux parties" }),
    ).toBeVisible();

    // Dealing again navigates, and `router.push` fetches the next party before
    // the screen changes. Held open here on purpose: that wait is the window the
    // table presses again in, thinking nothing happened — and a second press
    // would deal a *second* next party, a phantom deal numbered in the evening
    // and never played.
    await page.route("**/games/**", async route => {
      if (route.request().headers().rsc !== undefined) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      await route.continue();
    });

    const { data: opened } = await admin
      .from("games")
      .select("session_id")
      .eq("id", first)
      .single();
    const evening = opened?.session_id as string;
    const dealt = async () => {
      const { count } = await admin
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("session_id", evening);

      return count;
    };
    const chain = page.getByRole("button", {
      name: "Enchaîner une nouvelle partie",
    });

    await chain.click();

    // Waited on the next deal existing, not on a delay: from there the first
    // press is entirely over — recorded, dealt — and all that is left is the
    // navigation the route above is holding. That is the impatient second
    // press, not a double tap.
    await expect.poll(dealt).toBe(2);

    await chain.click();
    await page.unroute("**/games/**");

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
    // single row of « Parties ».
    const sessions = new Set((statuses ?? []).map(g => g.session_id));

    expect(sessions.size).toBe(1);

    expect([...sessions]).toEqual([evening]);

    // Any deal of the evening beyond those two joins the cleanup list, so a
    // phantom one doesn't survive the failure it caused.
    const { data: all } = await admin
      .from("games")
      .select("id")
      .eq("session_id", evening);

    for (const deal of all ?? []) {
      if (!games.includes(deal.id as string)) {
        games.push(deal.id as string);
      }
    }

    // The evening holds those two deals only — the second press dealt nothing.
    expect(all?.length).toBe(2);

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

    // On « Parties », the evening stays whole while one of its deals is still
    // on the table: one row, in plain sight, wearing « Reprendre » — not a bare
    // « Papayoo #2 » with the deals that came before folded away behind
    // « Terminées ».
    await page.goto("/games");

    await expect(page.getByText("Terminées ·")).toHaveCount(0);

    const eveningRow = page
      .locator("li")
      .filter({ hasText: "2 parties" })
      .first();
    const row = eveningRow.locator("> details > summary");

    await expect(row).toContainText("Reprendre");

    // Opened, it holds both deals, most recent first, each wearing its own rank
    // in the evening and its own status.
    await row.click();

    const deals = eveningRow.locator("a[href*='/play']");

    await expect(deals).toHaveCount(2);
    await expect(deals.nth(0)).toHaveAttribute("href", `/games/${second}/play`);
    await expect(deals.nth(0)).toContainText("#2");
    await expect(deals.nth(0)).toContainText("Reprendre");
    await expect(deals.nth(1)).toHaveAttribute("href", `/games/${first}/play`);
    await expect(deals.nth(1)).toContainText("#1");
    await expect(deals.nth(1)).toContainText("Terminée");

    // Papayoo hands no turn round the table: the launch seats a first player and
    // never moves him, so a card naming him would name him for the whole
    // evening. The players are listed, and nothing more is claimed of them.
    await expect(page.getByText(/Au tour de/)).toHaveCount(0);
    await expect(deals.nth(0)).toContainText(players[0]);
    await expect(deals.nth(0)).not.toContainText(`1. ${players[0]}`);
  } finally {
    for (const gameId of games) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});

/**
 * The other side of the offer (full-suite only — untagged): the end screen is
 * also where a party reopened from the history lands, months after the table
 * got up. Dealing from there would have filed a brand new party under that old
 * evening — « 3ᵉ partie de la soirée » a month later — so the offer is tied to
 * the clock, not to the screen. Same chainable Papayoo, same screen, one hour
 * being the whole difference.
 */
test("stops offering the next deal once the table has got up", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  let gameId: string | null = null;

  try {
    const { data: papayoo } = await admin
      .from("boardgames")
      .select("id, is_chainable")
      .eq("name", "Papayoo")
      .single();

    // The game itself still says parties may be chained — what follows is about
    // the party's age alone, not about the setting being off.
    expect(papayoo?.is_chainable).toBe(true);

    const idOf = await playerIds(players);
    const lastMonth = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    gameId = await seedParty(
      admin,
      papayoo?.id as string,
      players.map((name, seat) => ({
        playerId: idOf(name),
        score: 100 * (seat + 1),
        isWinner: seat === 0,
      })),
      { endedAt: lastMonth },
    );

    await page.goto(`/games/${gameId}/play`);

    await expect(page.getByText("Partie terminée !")).toBeVisible();

    // The way out is the games list, and it is the only button: nothing here
    // can start an evening that ended a month ago.
    await expect(
      page.getByRole("button", { name: "Enchaîner une nouvelle partie" }),
    ).toHaveCount(0);

    await expect(
      page.getByRole("link", { name: "Retour aux parties" }),
    ).toBeVisible();
  } finally {
    await dropSeeded(admin, { games: [gameId], playerNames: players });
  }
});
