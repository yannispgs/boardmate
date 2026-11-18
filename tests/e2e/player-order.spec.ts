import { expect, type Locator, type Page, test } from "@playwright/test";

import { adminClient, CATAN_NAME, seedPlayers } from "./utils/supabase";

/**
 * Putting the picked players in another order without unpicking them
 * (full-suite only — untagged): a card held still for half a second lifts and is
 * dragged to its seat; a press that moves first scrolls, and a tap still picks.
 */

/** A phone's screen, short enough for a table of eight to overflow it. */
test.use({ viewport: { width: 390, height: 520 }, hasTouch: true });

/** Opens the players step of a Catan party and picks `players`, in order. */
async function pick(page: Page, players: string[]): Promise<void> {
  await page.goto("/games/new");
  await page.getByRole("button", { name: CATAN_NAME, exact: true }).click();
  await page
    .getByRole("button", { name: "Sans configuration", exact: true })
    .click();
  for (const name of players) {
    await page.getByRole("button", { name, exact: true }).click();
  }
}

/** The seeded players, in the order the list shows them with their seats. */
async function seats(page: Page, players: string[]): Promise<string[]> {
  const rows = await page.getByRole("listitem").allTextContents();

  return rows.flatMap(row => {
    const name = players.find(p => row.startsWith(p));

    return name === undefined ? [] : [`${name}:${row.slice(name.length)}`];
  });
}

type TouchType = "touchStart" | "touchMove" | "touchEnd";

function centre(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Lets the page draw `count` frames — what a finger's next move waits for on
 * a phone, rather than a guess at a number of milliseconds.
 */
async function frames(page: Page, count: number): Promise<void> {
  await page.evaluate(
    n =>
      new Promise<void>(resolve => {
        let left = n;
        const tick = () => {
          left -= 1;
          if (left <= 0) {
            resolve();
          } else {
            requestAnimationFrame(tick);
          }
        };

        requestAnimationFrame(tick);
      }),
    count,
  );
}

/** The card a held press has lifted, once it has. */
function lifted(page: Page): Locator {
  return page.locator("li[data-dragging]");
}

/**
 * A finger held on `from` — until the card lifts, when `hold` — then slid onto
 * `to` and lifted, sent as raw touches, the way a phone does, through
 * Chromium's protocol. Without `hold` the finger moves at once, as to scroll.
 */
async function touchDrag(
  page: Page,
  from: Locator,
  to: Locator,
  hold: boolean,
): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const start = centre((await from.boundingBox()) ?? fail());
  const touch = (type: TouchType, x: number, y: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });

  // The seat aimed at, where it stands before anything moves — the finger goes
  // to that place, while the card on it makes room.
  const end = centre((await to.boundingBox()) ?? fail());

  await touch("touchStart", start.x, start.y);
  if (hold) {
    await expect(lifted(page)).toHaveCount(1);
  }

  for (let step = 1; step <= 15; step += 1) {
    await touch(
      "touchMove",
      start.x,
      start.y + ((end.y - start.y) * step) / 15,
    );
    await frames(page, 2);
  }

  await touch("touchMove", end.x, end.y);
  if (hold) {
    // The card has caught up with the finger, over the seat aimed at.
    await expect
      .poll(async () => {
        const box = (await lifted(page).boundingBox()) ?? fail();

        return Math.abs(centre(box).y - end.y);
      })
      .toBeLessThan(8);
  }
  await frames(page, 3);
  await touch("touchEnd", end.x, end.y);
}

function fail(): never {
  throw new Error("element not on screen");
}

test("moves a picked player to another seat by holding the card", async ({
  page,
  browserName,
}) => {
  // Raw touches are sent through Chromium's own protocol (CDP), which WebKit
  // does not speak: there is nothing to run there.
  test.skip(browserName !== "chromium", "raw touches go through Chromium"); // NOSONAR

  const players = await seedPlayers(3);

  try {
    await pick(page, players);

    expect(await seats(page, players)).toEqual([
      `${players[0]}:1`,
      `${players[1]}:2`,
      `${players[2]}:3`,
    ]);

    const card = (name: string) =>
      page.getByRole("button", { name: new RegExp(`^${name}`) });

    // Held half a second, then slid down onto the third seat.
    await touchDrag(page, card(players[0]), card(players[2]), true);

    await expect
      .poll(() => seats(page, players))
      .toEqual([`${players[1]}:1`, `${players[2]}:2`, `${players[0]}:3`]);

    // A finger that moves straight away is scrolling: nothing is lifted.
    await touchDrag(page, card(players[1]), card(players[0]), false);

    expect(await seats(page, players)).toEqual([
      `${players[1]}:1`,
      `${players[2]}:2`,
      `${players[0]}:3`,
    ]);

    // Held, then let go where it was: the player stays picked, in their seat —
    // even once the late tap the phone sends after the finger lifts lands.
    await touchDrag(page, card(players[2]), card(players[2]), true);
    // Long enough for the late tap a phone sends after a long press to land.
    await frames(page, 20);

    expect(await seats(page, players)).toEqual([
      `${players[1]}:1`,
      `${players[2]}:2`,
      `${players[0]}:3`,
    ]);

    // And the order is the one the party is dealt with.
    await page.getByRole("button", { name: "Continuer →" }).click();
    await expect(
      page.getByText(`1. ${players[1]} · 2. ${players[2]} · 3. ${players[0]}`),
    ).toBeVisible();
  } finally {
    await adminClient().from("players").delete().in("name", players);
  }
});

test("scrolls the list under a card dragged to its edge", async ({
  page,
  browserName,
}) => {
  // Raw touches are sent through Chromium's own protocol (CDP), which WebKit
  // does not speak: there is nothing to run there.
  test.skip(browserName !== "chromium", "raw touches go through Chromium"); // NOSONAR

  const players = await seedPlayers(8);

  try {
    await pick(page, players);

    // The list scrolls on its own, between the step's title and its footer.
    const list = page.locator("main ul").first();
    const scroller = list.locator(
      "xpath=ancestor::*[contains(@class, 'overflow-y-auto')][1]",
    );

    await scroller.evaluate(el => {
      el.scrollTop = 0;
    });

    const last = page.getByRole("button", {
      name: new RegExp(`^${players[7]}`),
    });

    await expect(last).not.toBeInViewport();

    // Held, then brought down to the list's bottom edge and kept there: the
    // list scrolls under the card until it reaches the last seat.
    const first = page.getByRole("button", {
      name: new RegExp(`^${players[0]}`),
    });
    const start = centre((await first.boundingBox()) ?? fail());
    const edge = (await scroller.boundingBox()) ?? fail();
    const bottom = edge.y + edge.height - 10;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: TouchType, y: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: start.x, y }],
      });

    // How fast the list scrolls, in px a second, while the finger rests at `y`.
    const speedAt = async (y: number) => {
      const mark = () =>
        scroller.evaluate(el => [el.scrollTop, performance.now()]);
      const [top0, t0] = await mark();

      for (let i = 0; i < 16; i += 1) {
        await touch("touchMove", y + (i % 2));
        await frames(page, 3);
      }

      const [top1, t1] = await mark();

      return ((top1 - top0) / (t1 - t0)) * 1000;
    };
    const band = edge.height * 0.25;
    const shallow = edge.y + edge.height - band * 0.85;

    await touch("touchStart", start.y);
    await expect(lifted(page)).toHaveCount(1);
    for (let y = start.y; y <= shallow; y += 15) {
      await touch("touchMove", y);
      await frames(page, 2);
    }

    // Just into the band, the list creeps; on the edge it runs — but never
    // faster than the eye can follow.
    const slow = await speedAt(shallow);
    const fast = await speedAt(bottom);

    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(slow * 1.5);
    expect(fast).toBeLessThan(500);

    for (let y = shallow; y <= bottom; y += 15) {
      await touch("touchMove", y);
      await frames(page, 2);
    }
    // A finger held still on the edge still trembles: so does this one.
    for (let i = 0; i < 40; i += 1) {
      await touch("touchMove", bottom + (i % 2));
      await frames(page, 3);
    }
    await touch("touchEnd", bottom);

    await expect
      .poll(async () => (await seats(page, players)).at(-1))
      .toBe(`${players[0]}:8`);
  } finally {
    await adminClient().from("players").delete().in("name", players);
  }
});
