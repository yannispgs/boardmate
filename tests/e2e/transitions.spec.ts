import { expect, type Locator, test } from "@playwright/test";

import {
  adminClient,
  boardgameId,
  playerIds,
  seedParty,
  seedPlayers,
  TERRAFORMING_MARS_NAME,
} from "./utils/supabase";

const PLAYER_COUNT = 3;

/**
 * A Terraforming Mars game sat on the **last** phase of its first generation.
 * Production is played all at once, so it carries « Phase terminée → » — and
 * closing it is what rolls the game into the next generation, which is the one
 * moment the screen has something to announce.
 */
async function seedLastPhase(names: string[]): Promise<string> {
  const admin = adminClient();
  const idOf = await playerIds(names);

  return seedParty(
    admin,
    await boardgameId(TERRAFORMING_MARS_NAME),
    names.map(name => ({ playerId: idOf(name), score: null })),
    { ongoing: true, stage: 1, phase: 2 },
  );
}

/** What the browser is actually running on an element, animation-wise. */
async function animationOn(target: Locator): Promise<string> {
  return target.evaluate(node => {
    return getComputedStyle(node).animationName;
  });
}

/** Drops the game and its players, whatever the test did in between. */
async function cleanUp(gameId: string, names: string[]): Promise<void> {
  const admin = adminClient();

  if (gameId !== "") {
    await admin.from("games").delete().eq("id", gameId);
  }

  await admin.from("players").delete().in("name", names);
}

/**
 * The fades, with the browser willing to run them (full-suite only —
 * untagged). The rest of the suite plays under reduced motion, which is what
 * keeps every other journey from clicking where a button *was*; this file is
 * the one place that turns the movement back on and looks at it.
 */
test.describe("with the animations running", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("announces the new generation, then gets out of the way", async ({
    page,
  }) => {
    const names = await seedPlayers(PLAYER_COUNT);
    let gameId = "";

    try {
      gameId = await seedLastPhase(names);

      await page.goto(`/games/${gameId}/play`);

      // Reopening a game already in progress announces nothing: the table has
      // been playing this generation for an hour.
      await expect(page.getByRole("status")).toHaveCount(0);
      await expect(page.getByText("Ensuite : Génération 2")).toBeVisible();

      // The clock block is keyed on the phase, so it fades in on arrival too —
      // proof the animation is wired up before anything is asked of it.
      expect(await animationOn(page.locator(".clock-swap"))).toBe("clock-swap");

      await page.getByRole("button", { name: "Phase terminée →" }).click();

      // The card takes the screen and says where the table has landed. The
      // board stays underneath: it is an announcement, not a step to dismiss.
      const card = page.getByRole("status");

      await expect(card).toHaveText("Génération 2");
      await expect(
        page.getByRole("button", { name: "Phase terminée →" }),
      ).toBeVisible();

      // …and it leaves on its own, without anybody touching it.
      await expect(card).toHaveCount(0);
    } finally {
      await cleanUp(gameId, names);
    }
  });

  test("fades a modal in rather than dropping it on the page", async ({
    page,
  }) => {
    const names = await seedPlayers(PLAYER_COUNT);
    let gameId = "";

    try {
      gameId = await seedLastPhase(names);

      await page.goto(`/games/${gameId}/play`);
      await page
        .getByRole("button", { name: "Corriger le temps écoulé" })
        .click();

      // The two drawers of the play screen (FAQ, jalons) are dialogs too, and
      // they stay mounted off-screen — so the modal has to be named, not just
      // asked for by role.
      const modal = page.getByRole("dialog", {
        name: "Corriger le temps écoulé",
      });

      await expect(modal).toBeVisible();

      expect(await animationOn(modal)).toBe("overlay-in");
    } finally {
      await cleanUp(gameId, names);
    }
  });
});

/**
 * The same moment with the movement turned off at the operating system — the
 * setting the whole rest of the suite runs under. What must survive it is the
 * **information**: the generation card is held on screen by a timer, not by its
 * own fade, so it still arrives, still waits and still goes. Only the fading
 * stops.
 */
test("still announces the new generation with the movement turned off", async ({
  page,
}) => {
  const names = await seedPlayers(PLAYER_COUNT);
  let gameId = "";

  try {
    gameId = await seedLastPhase(names);

    await page.goto(`/games/${gameId}/play`);

    expect(await animationOn(page.locator(".clock-swap"))).toBe("none");

    await page.getByRole("button", { name: "Phase terminée →" }).click();

    const card = page.getByRole("status");

    await expect(card).toHaveText("Génération 2");
    await expect(card).toHaveCount(0);
  } finally {
    await cleanUp(gameId, names);
  }
});
