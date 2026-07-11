import { expect, test } from "@playwright/test";

import { adminClient, CATAN_ID, deleteConfigs } from "./utils/supabase";

/**
 * Config management for a boardgame (exhaustive, full-suite only — untagged).
 * Uses Catan, the one seeded boardgame with a config template (points-to-win +
 * bonus-card booleans). Covers the CRUD lifecycle and template validation.
 */

test("creates, edits and deletes a config", async ({ page }) => {
  const name = `E2E Config ${Date.now().toString(36)}`;
  const renamed = `${name} v2`;

  try {
    await page.goto(`/boardgames/${CATAN_ID}/configs`);

    await page
      .getByRole("button", { name: "+ Nouvelle configuration" })
      .click();
    await page.getByPlaceholder("ex. Partie rapide").fill(name);
    await page.locator("#pointsToWin").fill("12");
    await page.getByRole("checkbox", { name: /Maître du port/ }).check();
    await page.getByRole("button", { name: "Créer" }).click();

    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Edit → rename.
    await page.getByRole("button", { name: `Modifier ${name}` }).click();
    await expect(page.getByText("Modifier la configuration")).toBeVisible();
    await page.getByPlaceholder("ex. Partie rapide").fill(renamed);
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.getByText(renamed, { exact: true })).toBeVisible();

    // Delete → confirmation → gone.
    await page.getByRole("button", { name: `Supprimer ${renamed}` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Supprimer" }).click();

    await expect(page.getByText(renamed, { exact: true })).toHaveCount(0);
  } finally {
    await deleteConfigs([name, renamed]);
  }
});

test("edits the game's default configuration and persists it", async ({
  page,
}) => {
  const admin = adminClient();
  // Snapshot the shared template's fields so the seed defaults are restored.
  const { data: before } = await admin
    .from("config_templates")
    .select("fields")
    .eq("boardgame_id", CATAN_ID)
    .single();

  try {
    await page.goto(`/boardgames/${CATAN_ID}/configs`);

    // Open the defaults editor and bump the points-to-win default to 15.
    await page
      .getByRole("button", { name: "Modifier la configuration par défaut" })
      .click();
    await expect(page.getByText("Configuration par défaut")).toBeVisible();
    await page.locator("#pointsToWin").fill("15");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    // Reload (proving it round-tripped through the DB) → the create form now
    // pre-fills the new default.
    await page.reload();
    await page
      .getByRole("button", { name: "+ Nouvelle configuration" })
      .click();

    await expect(page.locator("#pointsToWin")).toHaveValue("15");
  } finally {
    await admin
      .from("config_templates")
      .update({ fields: before?.fields })
      .eq("boardgame_id", CATAN_ID);
  }
});

test("rejects a points value outside the allowed range", async ({ page }) => {
  const name = `E2E Bad ${Date.now().toString(36)}`;

  try {
    await page.goto(`/boardgames/${CATAN_ID}/configs`);

    await page
      .getByRole("button", { name: "+ Nouvelle configuration" })
      .click();
    await page.getByPlaceholder("ex. Partie rapide").fill(name);
    // The template caps points-to-win at 20.
    await page.locator("#pointsToWin").fill("999");
    await page.getByRole("button", { name: "Créer" }).click();

    // A field error surfaces and the config is not created.
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByText("Modifier la configuration")).toHaveCount(0);
  } finally {
    await deleteConfigs([name]);
  }
});
