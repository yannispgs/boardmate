import { expect, test } from "@playwright/test";

import { adminClient, dropSeeded, seedBoardgame } from "./utils/supabase";

/** Long enough that a tab bar waiting on the server would still be on the old tab. */
const SERVER_DELAY_MS = 2000;

/**
 * The tab bar answers the press, not the server (full-suite only — untagged).
 *
 * A tab of a game's page is a dynamic route: without a `loading.tsx` the router
 * holds the whole navigation until the data lands, so the pill stays where it
 * was and the press reads as one that missed. This pins the fix down by making
 * the server slow on purpose: the answer is held for two seconds, and within
 * that window the new tab must already be the open one, with its skeleton
 * underneath.
 *
 * Only the navigation is slowed. The prefetches Next fires when the tabs come
 * into view are let through first, exactly as on a real visit — they are what
 * put the fallback in the browser's hands before the press.
 */
test("moves the tab on the press and waits underneath it", async ({ page }) => {
  const admin = adminClient();
  const gameName = `E2E Onglets ${Date.now().toString(36)}`;
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, { name: gameName, maxPlayers: 4 });

    await page.goto(`/boardgames/${bgId}/edit`);
    await expect(
      page.getByRole("heading", { name: gameName, level: 1 }),
    ).toBeVisible();

    const records = page.getByRole("link", { name: "Records", exact: true });

    await expect(records).toBeVisible();

    // Next fires more than one prefetch per tab, and their answers are what put
    // the fallback in the browser's hands. Waiting for the network to fall
    // quiet is waiting for the last of them: hold back one prefetch by mistake
    // and the router has nothing to show, which would fail the test for a
    // reason that has nothing to do with the fix.
    await page.waitForLoadState("networkidle");

    // Only from here is the server made slow, so what the press has to work
    // with is exactly what a real visit leaves in the browser: the fallback,
    // and nothing of the tab's own data.
    await page.route("**/records*", async route => {
      await new Promise(resolve => setTimeout(resolve, SERVER_DELAY_MS));
      await route.continue();
    });

    await records.click();

    // Straight away — well inside the two seconds the server is sitting on.
    await expect(records).toHaveAttribute("aria-current", "page", {
      timeout: 1000,
    });
    await expect(page.getByTestId("tab-skeleton")).toBeVisible({
      timeout: 1000,
    });

    // …and the real tab does turn up once the server lets go.
    await expect(page.getByText("Ce qui est détenu")).toBeVisible();
    await expect(page.getByTestId("tab-skeleton")).toBeHidden();
  } finally {
    await dropSeeded(admin, { boardgames: [bgId] });
  }
});
