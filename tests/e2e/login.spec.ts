import { expect, test } from "@playwright/test";

import { uniqueEmail } from "./utils/auth";
import { clearMailbox, hasMailFor, waitForLoginCode } from "./utils/mailpit";
import { accountExists, createAdminAccount } from "./utils/supabase";

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

test("never mails, nor registers, an address without an account", async ({
  page,
}) => {
  await clearMailbox();

  const unknown = uniqueEmail("e2e-unknown");
  const known = uniqueEmail("e2e-known");
  await createAdminAccount(known);

  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(unknown);
  await page.getByRole("button", { name: "Recevoir un code" }).click();

  // Same screen as an address that does have an account: nothing here says
  // whether it does.
  await expect(page.getByText("Entre ton code")).toBeVisible();

  // The known address is the yardstick: once *its* code has landed, the
  // catcher has had every chance to be holding one for the other.
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(known);
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await waitForLoginCode(known);

  expect(await hasMailFor(unknown)).toBe(false);
  expect(await accountExists(unknown)).toBe(false);
});
