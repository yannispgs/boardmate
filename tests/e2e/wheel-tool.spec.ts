import { expect, test } from "@playwright/test";

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

  const input = page.getByPlaceholder(/Ajouter une entrée/);
  const names = ["Alpha", "Bravo", "Charlie"];

  for (const name of names) {
    await input.fill(name);
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
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
