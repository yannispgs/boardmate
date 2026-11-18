import { randomUUID } from "node:crypto";
import { type Browser, expect, type Page, test } from "@playwright/test";

import { confirmLaunch, funnelToRecap } from "./utils/funnel";
import { adminClient, seedPlayers } from "./utils/supabase";

const OTHER_COUNTING =
  "Un autre joueur est déjà en train de compter les points.";

/** Another phone at the table: same account, a tab — and a device — of its own. */
async function secondPhone(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    storageState: "tests/e2e/.auth/user.json",
  });

  return context.newPage();
}

/** Deals a Papayoo party from the play funnel, and returns its id. */
async function dealPapayoo(page: Page, players: string[]): Promise<string> {
  await funnelToRecap(page, players, undefined, "Papayoo");
  await page.getByRole("button", { name: "Lancer la partie" }).click();

  return confirmLaunch(page);
}

interface Table {
  admin: ReturnType<typeof adminClient>;
  players: string[];
  gameId: string;
  other: Page;
}

/**
 * Deals a Papayoo party for three seeded players, opens it on a second phone
 * too, runs the scenario, then clears the party and the players away.
 */
async function atTable(
  page: Page,
  browser: Browser,
  scenario: (table: Table) => Promise<void>,
): Promise<void> {
  const admin = adminClient();
  const players = await seedPlayers(3);
  let gameId: string | null = null;
  const other = await secondPhone(browser);

  try {
    gameId = await dealPapayoo(page, players);
    await other.goto(`/games/${gameId}/play`);
    await scenario({ admin, players, gameId, other });
  } finally {
    await other.context().close();
    if (gameId) {
      await admin.from("games").delete().eq("id", gameId);
    }
    await admin.from("players").delete().in("name", players);
  }
}

/**
 * One phone counts the points at a time (full-suite only — untagged). The
 * others see it as it happens, a phone that lost the race can fill the form in
 * but not hand it in, and a phone gone quiet can be relieved ten minutes on.
 */
test("holds the score form for the phone counting the points", async ({
  page,
  browser,
}) => {
  await atTable(page, browser, async ({ admin, players, gameId, other }) => {
    const otherOpen = other.getByRole("button", { name: "Entrer les scores" });

    await expect(otherOpen).toBeEnabled();

    // This phone opens the form: the other one hears of it straight away.
    await page.getByRole("button", { name: "Entrer les scores" }).click();

    await expect(otherOpen).toBeDisabled();
    await expect(other.getByText(OTHER_COUNTING)).toBeVisible();
    // Not before ten minutes.
    await expect(
      other.getByRole("button", { name: "Reprendre la main" }),
    ).toHaveCount(0);

    // Cancelling gives the form back to the table.
    await page.getByRole("button", { name: "Annuler" }).click();

    await expect(otherOpen).toBeEnabled();
    await expect(other.getByText(OTHER_COUNTING)).toHaveCount(0);

    // Opened again here, and taken meanwhile by a phone that got there first:
    // the sheet can still be filled in, not handed in.
    await page.getByRole("button", { name: "Entrer les scores" }).click();
    await page.getByLabel(`Score de ${players[0]}`).fill("100");
    await page.getByLabel(`Score de ${players[1]}`).fill("150");
    await page.getByLabel(`Score de ${players[2]}`).fill("0");

    const finish = page.getByRole("button", { name: "Terminer", exact: true });

    await expect(finish).toBeEnabled();

    await admin
      .from("games")
      .update({
        scoring_lock: randomUUID(),
        scoring_locked_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    await expect(finish).toBeDisabled();
    await expect(page.getByText(OTHER_COUNTING)).toBeVisible();

    // Ten minutes on, that phone has gone quiet: this one takes the form back.
    await admin
      .from("games")
      .update({
        scoring_locked_at: new Date(Date.now() - 11 * 60_000).toISOString(),
      })
      .eq("id", gameId);

    await page.getByRole("button", { name: "Reprendre la main" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Reprendre la main" })
      .click();

    await expect(finish).toBeEnabled();
    await finish.click();

    await expect(page.getByText("Partie terminée")).toBeVisible();

    const { data: recorded } = await admin
      .from("game_players")
      .select("score")
      .eq("game_id", gameId)
      .order("seat_order");

    expect((recorded ?? []).map(r => r.score)).toEqual([100, 150, 0]);
  });
});

test("asks before a link or the back button takes the phone counting the points away", async ({
  page,
  browser,
}) => {
  await atTable(page, browser, async ({ players, gameId, other }) => {
    await page.getByRole("button", { name: "Entrer les scores" }).click();
    await page.getByLabel(`Score de ${players[0]}`).fill("100");

    // The play screen's one way out, a tap away from the form.
    const back = page.getByRole("link", { name: "← Parties" });

    // Staying: the sheet is still there, as it was.
    await back.click();
    await expect(
      page
        .getByRole("dialog")
        .getByText(
          "Les scores saisis seront perdus et devront être saisis à nouveau.",
        ),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Annuler" })
      .click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}/play$`));
    await expect(page.getByLabel(`Score de ${players[0]}`)).toHaveValue("100");

    // The back button asks too, and staying keeps the sheet.
    await page.goBack();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Annuler" })
      .click();

    await expect(page).toHaveURL(new RegExp(`/games/${gameId}/play$`));
    await expect(page.getByLabel(`Score de ${players[0]}`)).toHaveValue("100");

    // Leaving: the page goes, and gives the form back to the table.
    await back.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Quitter" })
      .click();

    await expect(page).toHaveURL(/\/games(\?.*)?$/);
    await expect(
      other.getByRole("button", { name: "Entrer les scores" }),
    ).toBeEnabled();
    await expect(other.getByText(OTHER_COUNTING)).toHaveCount(0);
  });
});

test("leaves by the back button once the player says so", async ({
  page,
  browser,
}) => {
  await atTable(page, browser, async ({ other }) => {
    const open = page.getByRole("button", { name: "Entrer les scores" });

    // Given back while staying: the back button leaves at once, no question.
    await open.click();
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(open).toBeEnabled();

    await open.click();
    await expect(other.getByText(OTHER_COUNTING)).toBeVisible();
    await page.goBack();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Quitter" })
      .click();

    await expect(page).not.toHaveURL(/\/play$/);
    await expect(
      other.getByRole("button", { name: "Entrer les scores" }),
    ).toBeEnabled();
    await expect(other.getByText(OTHER_COUNTING)).toHaveCount(0);
  });
});
