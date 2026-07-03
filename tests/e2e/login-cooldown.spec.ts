import { expect, test } from "@playwright/test";

import { uniqueEmail } from "./utils/auth";
import { clearMailbox } from "./utils/mailpit";

/**
 * The resend-code rate limit (exhaustive, full-suite only — untagged). After a
 * code is requested, the "Renvoyer le code" button is disabled with a live
 * countdown so users can't hammer the OTP endpoint.
 */

// Runs unauthenticated: drop the shared session for this file.
test.use({ storageState: { cookies: [], origins: [] } });

test("rate-limits the resend button with a countdown", async ({ page }) => {
  await clearMailbox();

  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(uniqueEmail("e2e-cooldown"));
  await page.getByRole("button", { name: "Recevoir un code" }).click();

  await expect(page.getByText("Entre ton code")).toBeVisible();

  // The resend control shows a countdown and is disabled while it runs.
  const resend = page.getByRole("button", {
    name: /Renvoyer le code \(\d+s\)/,
  });
  await expect(resend).toBeVisible();
  await expect(resend).toBeDisabled();
});
