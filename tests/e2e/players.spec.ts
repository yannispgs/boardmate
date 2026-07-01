import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * Player lifecycle through the UI: create (with the "can't delete later"
 * confirmation), deactivate — which moves the player into the collapsed
 * "Désactivés" disclosure — then reactivate. Reuses the shared session.
 */
test("creates, deactivates and reactivates a player", {
  tag: "@critical",
}, async ({ page }) => {
  // Keep within the 20-char player-name limit (base36 timestamp stays short).
  const name = `E2E ${Date.now().toString(36)}`;

  await page.goto("/players");

  // Create the player (confirmation modal appears first).
  await page.getByRole("button", { name: "+ Ajouter un joueur" }).click();
  await page.getByLabel("Nom du joueur").fill(name);
  await page.getByRole("button", { name: "Ajouter" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Créer le joueur" }).click();

  // It lands in the active list with a deactivate (eye-off) control.
  const deactivate = page.getByRole("button", { name: `Désactiver ${name}` });
  await expect(deactivate).toBeVisible();

  // Never played → deactivation is immediate (no confirmation).
  await deactivate.click();
  await expect(deactivate).toHaveCount(0);

  // It now sits behind the collapsed "Désactivés" disclosure.
  const reactivate = page.getByRole("button", { name: `Réactiver ${name}` });
  await expect(reactivate).toBeHidden();
  await page.getByText(/Désactivés ·/).click();
  await expect(reactivate).toBeVisible();

  // Reactivate → back among the active players.
  await reactivate.click();
  await expect(
    page.getByRole("button", { name: `Désactiver ${name}` }),
  ).toBeVisible();

  // Clean up: never-played player is safely deletable.
  await adminClient().from("players").delete().eq("name", name);
});
