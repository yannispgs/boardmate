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

  // The settings are hidden behind a button; open them, then tweak options
  // (each regenerates the board): the balance tolerance, the outer-ring desert,
  // and finally dropping all constraints.
  await expect(page.getByLabel("la couronne extérieure")).toHaveCount(0);
  await page.getByRole("button", { name: /Configurer les paramètres/ }).click();

  await page.getByLabel("Écart de production toléré en pourcentage").fill("40");
  await expect(board).toBeVisible();
  // The recap tracks the settings: the tolerance is reflected.
  await expect(page.getByText(/reste à ±40 %/)).toBeVisible();

  await page.getByLabel("la couronne extérieure").check();
  await expect(board).toBeVisible();
  await expect(
    page.getByText(/désert est placé au centre ou sur la couronne extérieure/),
  ).toBeVisible();

  // Dropping all constraints flips the recap to the fully-random note.
  await page.getByLabel("Ignorer les contraintes de placement").check();
  await expect(board).toBeVisible();
  await expect(page.getByText(/totalement aléatoire/)).toBeVisible();
});
