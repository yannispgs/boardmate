import { expect, test } from "@playwright/test";

/**
 * The board generator: from the home menu → "Générer un plateau" → the list of
 * supported games → Catan, which renders a board and "Nouveau plateau" rolls a
 * different one. No DB, no fixtures. Full-suite only (untagged).
 */
test("generates and regenerates a Catan board", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Générer un plateau" }).click();

  await expect(
    page.getByRole("heading", { name: "Générer un plateau" }),
  ).toBeVisible();

  // The supported-games list → Catan.
  await page.getByRole("link", { name: "Catan" }).click();

  await expect(page.getByRole("heading", { name: "Catan" })).toBeVisible();

  const board = page.getByRole("img", { name: "Plateau de Catan généré" });

  await expect(board).toBeVisible();
  // The legend documents the terrains.
  await expect(page.getByText("Forêt")).toBeVisible();
  // The structure recap (dice combinations per resource) is shown.
  await expect(page.getByText("Structure du plateau")).toBeVisible();

  // Regenerating swaps the board for a different one (fresh random seed).
  const before = await board.textContent();
  await page.getByRole("button", { name: "Nouveau plateau" }).click();
  await expect(board).toBeVisible();

  await expect(async () => {
    expect(await board.textContent()).not.toBe(before);
  }).toPass();

  // The generator settings regenerate the board: open the outer ring for the
  // desert, then drop all constraints entirely.
  await page.getByLabel("la couronne extérieure").check();
  await expect(board).toBeVisible();

  await page.getByLabel("Ignorer les contraintes de placement").check();
  await expect(board).toBeVisible();

  // The recap of placement rules is shown at the bottom.
  await expect(page.getByText("Règles de placement")).toBeVisible();
});
