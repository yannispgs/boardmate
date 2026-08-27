import { expect, test } from "@playwright/test";

import {
  adminClient,
  playerIds,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/**
 * What the table says out loud on a long evening (full-suite only — untagged):
 * the biggest pile, the run of wins, the run of last places, and the mark
 * somebody keeps clearing.
 *
 * The evening is written straight into the books — five deals played out
 * through the UI would be five minutes of clicking to assert four sentences.
 * What the scenario does check is the pair of screens they are read on (the
 * deal on the table and a closed one) and the silence below five deals, which
 * is the whole guard: the panel opens the game's history, so it must not even
 * mount on an ordinary party.
 */
test("tells the evening's story once it has one, and not before", async ({
  page,
}) => {
  const admin = adminClient();
  const players = await seedPlayers(3);
  const gameName = `E2E Soirée ${Date.now().toString(36)}`;
  const sessionId = crypto.randomUUID();
  const seeded: string[] = [];
  let bgId: string | null = null;

  try {
    bgId =
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
            },
          })
          .select("id")
          .single()
      ).data?.id ?? null;

    const idOf = await playerIds(players);
    const deal = (scores: [number, number, number], winner: number) => {
      return seedParty(
        admin,
        bgId as string,
        scores.map((score, seat) => ({
          playerId: idOf(players[seat]),
          score,
          isWinner: seat === winner,
        })),
        { sessionId },
      );
    };

    // Five deals of one evening. The first player takes the first three, the
    // second the last two, and the third never leaves the bottom.
    seeded.push(await deal([120, 60, 30], 0));
    seeded.push(await deal([130, 70, 20], 0));
    seeded.push(await deal([140, 80, 25], 0));
    seeded.push(await deal([110, 90, 40], 1));
    seeded.push(await deal([100, 95, 35], 1));

    // A closed deal is read on the end screen, in the first screenful — under
    // this game there is no statistics panel to scroll down to.
    await page.goto(`/games/${seeded[4]}/play`);
    await expect(page.getByText("Partie terminée !")).toBeVisible();

    const facts = page.getByRole("list", { name: "Faits de la soirée" });

    await expect(facts).toBeVisible();
    await expect(facts.getByRole("listitem")).toHaveCount(4);
    await expect(facts).toContainText(
      `Plus gros score de la soirée : ${players[0]}, 140 points`,
    );
    await expect(facts).toContainText(
      `${players[0]} enchaîne 3 victoires d'affilée`,
    );
    await expect(facts).toContainText(
      `${players[2]} ferme la marche depuis 5 parties`,
    );
    // 100 is the upper quartile of everything this game has ever paid, rounded
    // to a figure a table would say — and the first player has cleared it every
    // single deal.
    await expect(facts).toContainText(
      `${players[0]} passe les 100 points dans 100 % de ses parties, joli !`,
    );

    // The deal still on the table says the same thing, under the standing that
    // backs it up.
    const sixth = await seedParty(
      admin,
      bgId as string,
      players.map(name => ({ playerId: idOf(name), score: null })),
      { sessionId, ongoing: true },
    );

    seeded.push(sixth);

    await page.goto(`/games/${sixth}/play`);
    await expect(page.getByText("6ᵉ partie de la soirée")).toBeVisible();
    await expect(facts).toBeVisible();
    await expect(facts).toContainText(
      `${players[2]} ferme la marche depuis 5 parties`,
    );

    // A party of its own has no evening to talk about, and says nothing rather
    // than saying it of one deal.
    const alone = await seedParty(
      admin,
      bgId as string,
      players.map(name => ({ playerId: idOf(name), score: null })),
      { ongoing: true },
    );

    seeded.push(alone);

    await page.goto(`/games/${alone}/play`);
    await expect(
      page.getByRole("button", { name: "Entrer les scores" }),
    ).toBeVisible();
    await expect(facts).toHaveCount(0);
  } finally {
    for (const id of seeded) {
      await admin.from("games").delete().eq("id", id);
    }
    if (bgId) {
      await admin.from("boardgames").delete().eq("id", bgId);
    }
    await admin.from("players").delete().in("name", players);
  }
});
