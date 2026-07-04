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

  await page.getByRole("button", { name: "+ Ajouter un jeu" }).click();
  await page.getByLabel("Nom du jeu").fill(name);
  await page.getByLabel("Joueurs min").fill("2");
  await page.getByLabel("Joueurs max").fill("5");
  await page.getByLabel("Conseillé min").fill("3");
  await page.getByLabel("Conseillé max").fill("4");
  await page.getByLabel("Durée moyenne (min)").fill("45");
  await page.getByLabel("Tags (séparés par des virgules)").fill("famille, dés");
  await page.getByRole("button", { name: "Ajouter" }).click();

  await expect(page.getByText(name, { exact: true })).toBeVisible();

  // Edit → rename.
  await page.getByRole("button", { name: `Modifier ${name}` }).click();
  await expect(page.getByText("Modifier le jeu")).toBeVisible();
  await page.getByLabel("Nom du jeu").fill(renamed);
  await page.getByRole("button", { name: "Enregistrer" }).click();

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
    await page.getByRole("button", { name: "+ Ajouter un jeu" }).click();
    await page.getByLabel("Nom du jeu").fill(name);

    // Enable scoring, final tally, lowest total wins (Skyjo-like).
    await page.getByLabel("Ce jeu se joue avec des points").check();
    await page.getByLabel("Condition de victoire").selectOption("lowest");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Re-open the edit form: the saved scoring type round-trips into it.
    await page.getByRole("button", { name: `Modifier ${name}` }).click();
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

test("deactivates then reactivates a boardgame", async ({ page }) => {
  const name = `E2E Off ${Date.now().toString(36)}`;

  try {
    await page.goto("/boardgames");
    await page.getByRole("button", { name: "+ Ajouter un jeu" }).click();
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
  await page.getByRole("button", { name: "+ Ajouter un jeu" }).click();

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
