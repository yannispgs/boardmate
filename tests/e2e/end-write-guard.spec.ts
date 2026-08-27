import { expect, test } from "@playwright/test";

import { adminClient, seedPlayers } from "./utils/supabase";

/**
 * Two phones counting the same party (full-suite only — untagged). Everybody at
 * the table has the game open, and at the end everybody is looking at the score
 * form: two of them handing in their own totals would each write over the
 * other's, and the last one through would win silently.
 *
 * A party ends once. The second count is refused on the way in — nothing of it
 * is written, no next party is dealt — and the screen that was one count behind
 * catches up instead of insisting.
 */
test("refuses a second count of a party and shows the table why", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  let gameId: string | null = null;

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
    gameId = page.url().match(/games\/([0-9a-f-]+)\/play/)?.[1] ?? "";

    // This phone counts the piles and types them in, exactly as it would any
    // other evening.
    await page.getByRole("button", { name: "Entrer les scores" }).click();
    await page.getByLabel(`Score de ${players[0]}`).fill("100");
    await page.getByLabel(`Score de ${players[1]}`).fill("150");
    await page.getByLabel(`Score de ${players[2]}`).fill("0");

    // Meanwhile, at the other end of the table, somebody hands the party in
    // first — with a sheet of his own, and a different winner.
    const { data: seats } = await admin
      .from("game_players")
      .select("player_id")
      .eq("game_id", gameId)
      .order("seat_order");
    const counted = (seats ?? []).map(s => s.player_id as string);

    await admin
      .from("games")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", gameId);
    await admin
      .from("game_players")
      .update({ score: 250 })
      .eq("game_id", gameId)
      .eq("player_id", counted[0]);
    await admin
      .from("game_players")
      .update({ score: 0, is_winner: true })
      .eq("game_id", gameId)
      .in("player_id", counted.slice(1));

    // Pressing on a party that is already in the books deals nothing: the
    // chaining happens after the recording, and the recording never lands.
    await page
      .getByRole("button", { name: "Enchaîner une nouvelle partie" })
      .click();

    await expect(
      page.getByText("Cette partie vient d'être terminée."),
    ).toBeVisible();

    // The screen stayed put — no next party was opened to navigate to…
    await expect(page).toHaveURL(new RegExp(`/games/${gameId}/play$`));

    // …and it caught up with what the table had already decided, rather than
    // leaving the score form sitting over a party that is over.
    await expect(page.getByText("Partie terminée")).toBeVisible();
    await expect(page.getByLabel(`Score de ${players[0]}`)).toHaveCount(0);

    const { data: party } = await admin
      .from("games")
      .select("session_id")
      .eq("id", gameId)
      .single();
    const { count: dealt } = await admin
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("session_id", party?.session_id as string);

    // The evening holds the one party it was always going to hold.
    expect(dealt).toBe(1);

    // And the sheet is the first count's, untouched by the totals typed here.
    const { data: recorded } = await admin
      .from("game_players")
      .select("score, is_winner")
      .eq("game_id", gameId)
      .order("seat_order");

    expect((recorded ?? []).map(r => [r.score, r.is_winner])).toEqual([
      [250, false],
      [0, true],
      [0, true],
    ]);
  } finally {
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
