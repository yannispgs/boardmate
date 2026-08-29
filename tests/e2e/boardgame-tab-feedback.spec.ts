import type { Request } from "@playwright/test";
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
 * Only the navigation is slowed, and only once every prefetch Next fires when
 * the tabs come into view has come back — exactly what a real visit leaves in
 * the browser before the press: the fallback, and nothing of the tab's data.
 */
test("moves the tab on the press and waits underneath it", async ({ page }) => {
  const admin = adminClient();
  const gameName = `E2E Onglets ${Date.now().toString(36)}`;
  let bgId: string | null = null;

  try {
    bgId = await seedBoardgame(admin, { name: gameName, maxPlayers: 4 });

    // Next fires several prefetches for the tab, and it is the LAST BYTE of
    // them that hands the fallback to the router — a prefetch whose answer has
    // only begun leaves nothing to show. Counted here so the press can wait for
    // the real thing rather than for a delay picked out of the air.
    const prefetch = { started: 0, settled: 0 };
    const isTabPrefetch = (request: Request) =>
      request.url().includes("/records") &&
      request.headers()["next-router-prefetch"] === "1";

    page.on("request", request => {
      if (isTabPrefetch(request)) {
        prefetch.started += 1;
      }
    });

    const settle = (request: Request) => {
      if (isTabPrefetch(request)) {
        prefetch.settled += 1;
      }
    };

    page.on("requestfinished", settle);
    page.on("requestfailed", settle);

    await page.goto(`/boardgames/${bgId}/edit`);
    await expect(
      page.getByRole("heading", { name: gameName, level: 1 }),
    ).toBeVisible();

    const records = page.getByRole("link", { name: "Records", exact: true });

    await expect(records).toBeVisible();

    // At least one prefetch asked for, and none of them still on the wire.
    await expect
      .poll(() => prefetch.started > 0 && prefetch.started === prefetch.settled)
      .toBe(true);

    // Only from here is the server made slow.
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
