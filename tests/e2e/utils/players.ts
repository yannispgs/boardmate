import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Creates a player through the players screen — the form, then the « can't
 * delete later » confirmation — and comes back once it sits in the active list.
 * Returns its deactivate (eye-off) control, which is how the list is read.
 */
export async function createPlayerThroughUi(
  page: Page,
  name: string,
): Promise<Locator> {
  await page.goto("/players");

  await page.getByRole("button", { name: "+ Ajouter un joueur" }).click();
  await page.getByLabel("Nom du joueur").fill(name);
  await page.getByRole("button", { name: "Ajouter" }).click();

  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Créer le joueur" }).click();

  const deactivate = page.getByRole("button", { name: `Désactiver ${name}` });

  await expect(deactivate).toBeVisible();

  return deactivate;
}
