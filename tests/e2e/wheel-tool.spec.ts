import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * The standalone wheel of fortune reached from the home menu (full-suite only —
 * untagged). Reduced motion makes the spin settle instantly, so it's
 * deterministic without waiting on the animation. Free-text entries only, so no
 * fixtures are needed.
 */
test("spins the standalone wheel over custom entries", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/");
  await page.getByRole("link", { name: "Roue de la chance" }).click();

  await expect(
    page.getByRole("heading", { name: "Roue de la chance" }),
  ).toBeVisible();

  // Two entries are required before the wheel can spin.
  const spin = page.getByRole("button", { name: "Tourner la roue" });

  await expect(spin).toBeDisabled();

  const input = page.getByPlaceholder(/Rechercher ou créer/);
  const names = ["Alpha", "Bravo", "Charlie"];

  // No player matches the typed text → the search offers "Créer « … »" first.
  for (const name of names) {
    await input.fill(name);
    await page
      .getByRole("button", { name: new RegExp(`Créer.*${name}`) })
      .click();
  }

  await expect(spin).toBeEnabled();

  // Spin → one of the entries is announced as the winner.
  await spin.click();

  const banner = page.getByText(/🎉/);

  await expect(banner).toBeVisible();

  const text = (await banner.textContent()) ?? "";

  expect(names.some(n => text.includes(n))).toBe(true);

  // A won result offers a relaunch; removing an entry clears the result.
  await expect(page.getByRole("button", { name: "Relancer" })).toBeVisible();
  await page.getByRole("button", { name: "Retirer Alpha" }).click();
  await expect(page.getByText(/🎉/)).toHaveCount(0);
});

test("searches existing players and offers to create off-app ones", async ({
  page,
}) => {
  const admin = adminClient();
  const names = [
    `Yannou-${Date.now().toString(36)}`,
    `Groot-${Date.now().toString(36)}`,
  ];
  await admin.from("players").insert(names.map(name => ({ name })));

  try {
    await page.goto("/tools/wheel");

    const input = page.getByPlaceholder(/Rechercher ou créer/);
    const suggestions = page.getByTestId("wheel-suggestions");

    // Focusing the empty field lists every active player (alphabetical).
    await input.click();
    await expect(
      suggestions.getByRole("button", { name: names[0] }),
    ).toBeVisible();
    await expect(
      suggestions.getByRole("button", { name: names[1] }),
    ).toBeVisible();

    // Typing a substring that no player equals: "create" is offered first, and
    // the player whose name contains it is suggested (Groot is not).
    await input.fill("Yann");
    await expect(
      page.getByRole("button", { name: /Créer.*Yann/ }),
    ).toBeVisible();
    await expect(
      suggestions.getByRole("button", { name: names[0] }),
    ).toBeVisible();
    await expect(
      suggestions.getByRole("button", { name: names[1] }),
    ).toHaveCount(0);

    // Clicking the player toggles it onto the wheel (a chip appears).
    await suggestions.getByRole("button", { name: names[0] }).click();
    await expect(
      page.getByRole("button", { name: `Retirer ${names[0]}` }),
    ).toBeVisible();

    // Clicking the same (now selected) player again removes it from the wheel.
    await suggestions.getByRole("button", { name: names[0] }).click();
    await expect(
      page.getByRole("button", { name: `Retirer ${names[0]}` }),
    ).toHaveCount(0);

    // Typing a player's exact name offers no "create" option.
    await input.fill(names[1]);
    await expect(page.getByRole("button", { name: /Créer/ })).toHaveCount(0);
    await expect(
      suggestions.getByRole("button", { name: names[1] }),
    ).toBeVisible();
  } finally {
    await admin.from("players").delete().in("name", names);
  }
});

/**
 * The suggestion list on a phone-sized screen (full-suite only — untagged).
 *
 * A short viewport is the reproducible half of what the keyboard does on an
 * iPhone: it leaves the field with less room under it than the list wants. The
 * list has to stay inside what is on show either way — the screen has nothing
 * to scroll, so anything pushed past the bottom is simply unreachable.
 */
test.describe("on a phone-sized screen", () => {
  test.use({ viewport: { width: 390, height: 420 } });

  test("keeps the whole suggestion list on screen", async ({ page }) => {
    const admin = adminClient();
    const names = Array.from(
      { length: 8 },
      (_v, i) => `Petit-${i}-${Date.now().toString(36)}`,
    );
    await admin.from("players").insert(names.map(name => ({ name })));

    try {
      await page.goto("/tools/wheel");

      const suggestions = page.getByTestId("wheel-suggestions");

      await page.getByPlaceholder(/Rechercher ou créer/).click();
      await expect(suggestions).toBeVisible();

      // Too little room under the field, more above it → it opens upwards.
      await expect(suggestions).toHaveAttribute("data-placement", "above");

      const box = await suggestions.boundingBox();
      const viewport = page.viewportSize();

      expect(box).not.toBeNull();
      expect(box?.y).toBeGreaterThanOrEqual(0);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
        viewport?.height ?? 0,
      );

      // Shortened, not truncated: every player is still reachable by scrolling
      // inside the list.
      await suggestions
        .getByRole("button", { name: names[7] })
        .scrollIntoViewIfNeeded();
      await expect(
        suggestions.getByRole("button", { name: names[7] }),
      ).toBeVisible();
    } finally {
      await admin.from("players").delete().in("name", names);
    }
  });
});
