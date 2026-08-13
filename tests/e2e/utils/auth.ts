import { expect, type Page } from "@playwright/test";

import { clearMailbox, waitForLoginCode } from "./mailpit";
import { createAdminAccount } from "./supabase";

/** A throwaway, unique e-mail so each login mints a fresh local user. */
export function uniqueEmail(prefix = "e2e"): string {
  // This address only has to be unique within a test run, never unguessable —
  // nothing is derived from it, so a weak PRNG is the right tool.
  const rand = Math.random().toString(36).slice(2, 8); // NOSONAR
  return `${prefix}-${Date.now()}-${rand}@example.com`;
}

/**
 * Drives the real two-step login UI end-to-end: request a code for `email`,
 * read it back from the mail catcher, enter it, and wait to land authenticated
 * on the home page. This is the genuine OTP round-trip (OWASP A07 surface), not
 * a programmatic session injection.
 */
export async function loginViaOtp(
  page: Page,
  email: string,
  { asAdmin = true }: { asAdmin?: boolean } = {},
): Promise<void> {
  if (asAdmin) {
    await createAdminAccount(email);
  }

  await clearMailbox();

  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir un code" }).click();

  // Step 2 appears once the code is sent.
  await expect(page.getByText("Entre ton code")).toBeVisible();

  const code = await waitForLoginCode(email);
  await page.getByLabel("Code de connexion").fill(code);
  await page.getByRole("button", { name: "Se connecter" }).click();

  // verifyCode redirects home; the login UI must be gone.
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Se connecter" })).toHaveCount(
    0,
  );
}
