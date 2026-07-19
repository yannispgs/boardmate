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

  // The supported-games list → Catan - Base.
  await page.getByRole("link", { name: "Catan - Base" }).click();

  await expect(
    page.getByRole("heading", { name: "Catan - Base" }),
  ).toBeVisible();

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

  // Turning a constraint off drops it from the recap.
  await expect(page.getByText(/rouges/)).toBeVisible();
  await page.getByLabel("Pas de 6/8 adjacents").uncheck();
  await expect(board).toBeVisible();
  await expect(page.getByText(/rouges/)).toHaveCount(0);

  // Dropping all constraints flips the recap to the fully-random note.
  await page.getByLabel("Ignorer toutes les contraintes de placement").check();
  await expect(board).toBeVisible();
  await expect(page.getByText(/totalement aléatoire/)).toBeVisible();
});

test("switches to the 5-6 player board", async ({ page }) => {
  await page.goto("/tools/board-generator/catan");

  const board = page.getByRole("img", { name: "Plateau de Catan généré" });

  await expect(board).toBeVisible();
  // Base board recap: 9 ports.
  await expect(page.getByText(/9 ports/)).toBeVisible();

  // The size selector switches to the larger extension board.
  await page.getByRole("button", { name: "5-6 joueurs" }).click();
  await expect(board).toBeVisible();
  // The recap tracks the variant: 11 ports and two deserts.
  await expect(page.getByText(/11 ports/)).toBeVisible();
  await expect(page.getByText(/2 déserts sont placés/)).toBeVisible();

  // The 5-6 board can be flipped between horizontal (default) and vertical.
  await expect(
    page.getByRole("button", { name: /Afficher verticalement/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Afficher verticalement/ }).click();
  await expect(board).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Afficher horizontalement/ }),
  ).toBeVisible();

  // The extension exposes the adjacent-deserts option instead of the rings.
  await page.getByRole("button", { name: /Configurer les paramètres/ }).click();
  await expect(page.getByLabel("la couronne extérieure")).toHaveCount(0);
  await page.getByLabel("Autoriser les deux déserts adjacents").check();
  await expect(board).toBeVisible();
  await expect(page.getByText(/éventuellement adjacents/)).toBeVisible();

  // Forcing an unreachable cap surfaces the ⚠️ warning affordance.
  await page.getByLabel("Pips maximum par intersection").fill("5");
  await expect(board).toBeVisible();

  const warn = page.getByRole("button", {
    name: "Voir les règles de placement non respectées",
  });

  await expect(warn).toBeVisible();
  await warn.click();
  await expect(page.getByText(/Règles non garanties/)).toBeVisible();
  await expect(page.getByText(/plafond de 5 pastilles/)).toBeVisible();
});
