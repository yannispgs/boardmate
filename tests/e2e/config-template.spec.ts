import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * Defining a game's configuration (the tunable fields) entirely from the UI —
 * so a game compatible with the existing mechanics needs no seed data. Uses the
 * "moniteur" timer preset. Full-suite only (untagged).
 */
test("defines a game's configuration from scratch, with the timer preset", async ({
  page,
}) => {
  const name = `E2E Tpl ${Date.now().toString(36)}`;

  try {
    // A brand-new game has no config template.
    await page.goto("/boardgames");
    await page.getByRole("link", { name: "+ Ajouter un jeu" }).click();
    await page.getByLabel("Nom du jeu").fill(name);
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Réglages → no config yet → define it via the field editor.
    await page.getByRole("link", { name: `Réglages de ${name}` }).click();
    await page
      .getByRole("button", { name: "Définir la configuration" })
      .click();

    // Drop in the timer fields, then save.
    await page.getByRole("button", { name: /Ajouter le moniteur/ }).click();
    await expect(page.getByLabel("Clé du champ").first()).toHaveValue(
      "turnBaseS",
    );
    await page
      .getByRole("button", { name: "Enregistrer la configuration" })
      .click();

    // The default-config summary now lists the timer fields.
    await expect(page.getByText("Durée de base (s)")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Modifier les champs" }),
    ).toBeVisible();
  } finally {
    await adminClient().from("boardgames").delete().eq("name", name);
  }
});
