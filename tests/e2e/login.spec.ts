import { expect, test } from "@playwright/test";

import { uniqueEmail } from "./utils/auth";
import { clearMailbox } from "./utils/mailpit";

// These run unauthenticated: drop the shared session for this file.
test.use({ storageState: { cookies: [], origins: [] } });

test("redirects unauthenticated visitors to the login page", {
  tag: "@critical",
}, async ({ page }) => {
  await page.goto("/players");

  await expect(page).toHaveURL("/login");
  await expect(page.getByLabel("Adresse e-mail")).toBeVisible();
});

test("rejects an invalid login code", { tag: "@critical" }, async ({
  page,
}) => {
  await clearMailbox();

  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(uniqueEmail("e2e-badcode"));
  await page.getByRole("button", { name: "Recevoir un code" }).click();

  await expect(page.getByText("Entre ton code")).toBeVisible();

  await page.getByLabel("Code de connexion").fill("000000");
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page.getByText(/Code invalide/)).toBeVisible();
});
