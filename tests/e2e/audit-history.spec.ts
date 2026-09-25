import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * The modification history, read from the administration menu (full-suite only
 * — untagged).
 *
 * The journey is deliberately the whole chain rather than the screen alone: the
 * writes are made through the app, and the question is whether the history
 * names them, signs them, and can still say what the row held before. A screen
 * rendering rows somebody seeded proves none of that.
 */
test("names the writes made through the app, and what they changed", async ({
  page,
}) => {
  // Within the 20-char player-name limit.
  const name = `Hist ${Date.now().toString(36)}`;

  await page.goto("/players");

  await page.getByRole("button", { name: "+ Ajouter un joueur" }).click();
  await page.getByLabel("Nom du joueur").fill(name);
  await page.getByRole("button", { name: "Ajouter" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Créer le joueur" }).click();

  const deactivate = page.getByRole("button", { name: `Désactiver ${name}` });
  await expect(deactivate).toBeVisible();

  // Never played → deactivation is immediate, and it is an update of one column.
  await deactivate.click();
  await expect(deactivate).toHaveCount(0);

  try {
    // Reached the way he asked for it: through the administration menu.
    await page.goto("/admin");
    await page
      .getByRole("link", { name: "Historique des modifications" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Historique" }),
    ).toBeVisible();

    await page.getByLabel("Ressource").selectOption("players");

    const lines = page
      .getByRole("listitem")
      .filter({ hasText: `Joueur · ${name}` });

    await expect(lines).toHaveCount(2);

    const modification = lines.filter({ hasText: "Modification" });

    // Signed: the session that did it, and the rights it held at that instant.
    await expect(modification.getByText("Administrateur")).toBeVisible();

    // The detail is the point of the table: what the column held on each side.
    await modification.getByRole("button", { name: /^Détail ·/ }).click();

    await expect(modification.getByText("actif")).toBeVisible();
    await expect(modification.getByText("oui", { exact: true })).toBeVisible();
    await expect(modification.getByText("non", { exact: true })).toBeVisible();

    // Narrowing to the other action drops it and keeps the creation.
    await page.getByLabel("Action").selectOption("insert");

    await expect(lines).toHaveCount(1);
    await expect(lines.getByText("Ajout")).toBeVisible();
  } finally {
    // Never played → safely deletable. The history keeps its lines regardless.
    await adminClient().from("players").delete().eq("name", name);
  }
});
