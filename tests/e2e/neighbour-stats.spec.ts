import { expect, test } from "@playwright/test";

import {
  adminClient,
  dropSeeded,
  playerIds,
  seedBoardgame,
  seedParty,
  seedPlayers,
} from "./utils/supabase";

/** The circle's piles, seat by seat: pile `i` sits between seat `i` and `i + 1`. */
function circle(
  seats: readonly string[],
  piles: readonly number[],
): Array<{
  playerId: string;
  score: number;
  isWinner: boolean;
  breakdown: Record<string, number>;
}> {
  const n = seats.length;
  const scored = seats.map((playerId, i) => {
    const left = piles[(i - 1 + n) % n];
    const right = piles[i];

    return {
      playerId,
      score: left * right,
      isWinner: false,
      breakdown: { left, right },
    };
  });
  const best = Math.max(...scored.map(s => s.score));

  return scored.map(s => ({ ...s, isWinner: s.score === best }));
}

/**
 * The neighbour figures on the stats "Jeux" tab (full-suite only — untagged),
 * shown for games whose points are shared in piles. Seeds a throwaway pair-scored
 * game — never the real Splito, whose scoring is the owner's to change — plays
 * the same four seats seven evenings, then checks the section reads the circle:
 * a line per player, the per-partner detail behind it, and a pairing seen once
 * held at arm's length.
 */
test("shows what each neighbour is worth on a pair-scored game", async ({
  page,
}) => {
  const admin = adminClient();
  const names = await seedPlayers(5);
  const gameName = `E2E Voisins ${Date.now().toString(36)}`;
  const games: string[] = [];
  let boardgame: string | null = null;

  try {
    boardgame = await seedBoardgame(admin, {
      name: gameName,
      minPlayers: 3,
      maxPlayers: 8,
      roundLimit: null,
      scoring: { timing: "final", entry: "pairs", winCondition: "highest" },
    });

    const idOf = await playerIds(names);
    const [ann, bob, cat, dan, eve] = names.map(idOf);

    // Six evenings round the same table, so the three regulars clear the four
    // parties a player needs to be listed at all.
    for (let i = 0; i < 6; i++) {
      games.push(
        await seedParty(
          admin,
          boardgame,
          circle([ann, bob, cat, dan], [6, 7, 5, 4]),
        ),
      );
    }

    // A seventh where a newcomer takes Bob's seat: he is then Ann's neighbour
    // exactly once, which is the thin sample the screen must own up to.
    games.push(
      await seedParty(
        admin,
        boardgame,
        circle([ann, eve, cat, dan], [3, 8, 5, 4]),
      ),
    );

    await page.goto("/stats");
    await page.getByRole("button", { name: "Jeux", exact: true }).click();
    await page.getByRole("button", { name: gameName, exact: true }).click();

    await expect(page.getByText("Ce que valent vos voisins")).toBeVisible();

    // Ann sat seven evenings, so she is listed; the newcomer sat one and isn't.
    const annCard = page.getByRole("button", { name: `À côté de ${names[0]}` });

    await expect(annCard).toBeVisible();
    await expect(
      page.getByRole("button", { name: `À côté de ${names[4]}` }),
    ).toBeHidden();

    await annCard.click();

    // The same question, pairing by pairing — and the one seen once says so
    // rather than passing for a verdict.
    const dialog = page.getByRole("dialog");

    await expect(dialog.getByText(`Assis à côté de ${names[0]}`)).toBeVisible();
    await expect(dialog.getByText(names[1], { exact: true })).toBeVisible();
    await expect(dialog.getByText("6 fois", { exact: true })).toBeVisible();
    await expect(dialog.getByText("1 fois — trop peu")).toBeVisible();
  } finally {
    await dropSeeded(admin, {
      games,
      boardgames: [boardgame],
      playerNames: names,
    });
  }
});
