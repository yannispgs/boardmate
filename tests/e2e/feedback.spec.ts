import { expect, test } from "@playwright/test";

import { adminClient } from "./utils/supabase";

/**
 * The "Retours" idea box (full-suite only — untagged): submit an idea, see it
 * listed and persisted; and the home menu now links to it (and drops the old
 * dice tool).
 */
test("adds an idea to the feedback box and lists it", async ({ page }) => {
  const admin = adminClient();
  const message = `E2E idée ${Date.now()}`;

  try {
    await page.goto("/feedback");

    await page.getByLabel("Votre retour").fill(message);
    await page.getByRole("button", { name: "Envoyer" }).click();

    await expect(page.getByText("Merci, c'est noté !")).toBeVisible();

    const card = page.getByRole("listitem").filter({ hasText: message });

    await expect(card).toBeVisible();
    // A fresh idea is untriaged until the stage is set out of band.
    await expect(card.getByText("Nouveau")).toBeVisible();

    // It survives a reload (persisted, not just local).
    await page.reload();
    await expect(
      page.getByRole("listitem").filter({ hasText: message }),
    ).toBeVisible();
  } finally {
    await admin.from("feedback").delete().eq("message", message);
  }
});

test("the home menu links to Retours and no longer offers the dice tool", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: /Retours/ })).toBeVisible();
  await expect(page.getByText("Lancer de dés")).toHaveCount(0);
});
