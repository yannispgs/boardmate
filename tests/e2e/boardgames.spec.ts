import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * Boardgame management (exhaustive, full-suite only — untagged). Covers the CRUD
 * lifecycle, the deactivate/reactivate flow, and the three logo sources.
 */

/** 1×1 transparent PNG, fed to the file picker without a fixture on disk. */
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("creates, edits and deletes a boardgame", async ({ page }) => {
  const name = `E2E Jeu ${Date.now().toString(36)}`;
  const renamed = `${name} v2`;

  await page.goto("/boardgames");

  // Adding a game is now a dedicated page, not an inline panel.
  await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
  await expect(page).toHaveURL(/\/boardgames\/new$/);
  await page.getByLabel("Nom du jeu").fill(name);
  await page.getByLabel("Joueurs min").fill("2");
  await page.getByLabel("Joueurs max").fill("5");
  await page.getByLabel("Conseillé min").fill("3");
  await page.getByLabel("Conseillé max").fill("4");
  await page.getByLabel("Durée moyenne (min)").fill("45");
  await page.getByLabel("Nombre de tours (vide = illimité)").fill("20");
  await page.getByLabel("Tags (séparés par des virgules)").fill("famille, dés");
  await page.getByRole("button", { name: "Ajouter" }).click();

  await expect(page.getByText(name, { exact: true })).toBeVisible();

  // Edit → the unified settings page → the round limit round-trips → rename.
  await page.getByRole("link", { name: `Réglages de ${name}` }).click();
  await expect(page).toHaveURL(/\/boardgames\/[0-9a-f-]+\/edit$/);
  await expect(page.getByRole("heading", { name: /Réglages/ })).toBeVisible();
  await expect(
    page.getByLabel("Nombre de tours (vide = illimité)"),
  ).toHaveValue("20");
  await page.getByLabel("Nom du jeu").fill(renamed);
  // Saving stays on the settings page (it's the game's hub) and confirms.
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Enregistré")).toBeVisible();

  // Back to the list to see the rename and delete it.
  await page.getByRole("link", { name: "← Jeux" }).click();
  await expect(page.getByText(renamed, { exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);

  // Delete → confirmation dialog → gone.
  await page.getByRole("button", { name: `Supprimer ${renamed}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Supprimer" }).click();

  await expect(page.getByText(renamed, { exact: true })).toHaveCount(0);
});

test("edits a boardgame's scoring type", async ({ page }) => {
  const name = `E2E Score ${Date.now().toString(36)}`;

  try {
    await page.goto("/boardgames");
    await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
    await page.getByLabel("Nom du jeu").fill(name);

    // Enable scoring, final tally, lowest total wins (Skyjo-like).
    await page.getByLabel("Ce jeu se joue avec des points").check();
    await page.getByLabel("Condition de victoire").selectOption("lowest");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Re-open the edit form: the saved scoring type round-trips into it.
    await page.getByRole("link", { name: `Réglages de ${name}` }).click();
    await expect(
      page.getByLabel("Ce jeu se joue avec des points"),
    ).toBeChecked();
    await expect(page.getByLabel("Condition de victoire")).toHaveValue(
      "lowest",
    );
  } finally {
    await adminClient().from("boardgames").delete().eq("name", name);
  }
});

test("builds a category scoresheet from the edit form", async ({ page }) => {
  const name = `E2E Cat ${Date.now().toString(36)}`;

  try {
    await page.goto("/boardgames");
    await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
    await page.getByLabel("Nom du jeu").fill(name);

    // Scored, tallied by categories: a section with a field + a standalone one.
    await page.getByLabel("Ce jeu se joue avec des points").check();
    await page.getByLabel("Décompte des points").selectOption("categories");

    // The category sheet is collapsed by default — open it to edit it.
    await page.getByText("Détail des catégories", { exact: true }).click();
    await page.getByRole("button", { name: "+ Section" }).click();
    await page.getByPlaceholder("Nom de la section").fill("Animaux");
    await page.getByRole("button", { name: "+ Champ dans la section" }).click();
    await page.getByPlaceholder("Nom du champ").first().fill("Ours");

    await page.getByRole("button", { name: "+ Champ", exact: true }).click();
    await page.getByPlaceholder("Nom du champ").last().fill("Bonus");

    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Re-open: the whole sheet round-trips into the editor.
    await page.getByRole("link", { name: `Réglages de ${name}` }).click();
    await expect(page.getByLabel("Décompte des points")).toHaveValue(
      "categories",
    );
    // Expand the collapsed category sheet to inspect it.
    await page.getByText("Détail des catégories", { exact: true }).click();
    await expect(page.getByPlaceholder("Nom de la section")).toHaveValue(
      "Animaux",
    );
    const fields = page.getByPlaceholder("Nom du champ");
    await expect(fields.nth(0)).toHaveValue("Ours");
    await expect(fields.nth(1)).toHaveValue("Bonus");
  } finally {
    await adminClient().from("boardgames").delete().eq("name", name);
  }
});

test("deactivates then reactivates a boardgame", async ({ page }) => {
  const name = `E2E Off ${Date.now().toString(36)}`;

  try {
    await page.goto("/boardgames");
    await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
    await page.getByLabel("Nom du jeu").fill(name);
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Never played → deactivation is immediate (no confirmation).
    await page.getByRole("button", { name: `Désactiver ${name}` }).click();

    // It now sits behind the collapsed "Désactivés" disclosure.
    const reactivate = page.getByRole("button", { name: `Réactiver ${name}` });
    await expect(reactivate).toBeHidden();
    await page.getByText(/Désactivés ·/).click();
    await expect(reactivate).toBeVisible();

    await reactivate.click();
    await expect(
      page.getByRole("button", { name: `Désactiver ${name}` }),
    ).toBeVisible();
  } finally {
    await adminClient().from("boardgames").delete().eq("name", name);
  }
});

test("offers three logo sources and uploads a file", async ({ page }) => {
  await page.goto("/boardgames");
  await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();

  // File is the default source: its picker is shown.
  await expect(
    page.getByRole("button", { name: "URL", exact: true }),
  ).toBeVisible();

  // URL source → the URL input appears.
  await page.getByRole("button", { name: "URL", exact: true }).click();
  await expect(page.getByLabel("URL du logo (PNG ou JPEG)")).toBeVisible();

  // Paste source → the paste zone appears.
  await page.getByRole("button", { name: "Coller", exact: true }).click();
  await expect(page.getByLabel("Zone de collage du logo")).toBeVisible();

  // Back to File → upload a PNG and see the preview.
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: PNG_1PX,
  });
  await expect(page.getByRole("img", { name: "Logo" })).toBeVisible();

  await page.getByRole("button", { name: "Annuler" }).click();
});
