import { test as setup } from "@playwright/test";

import { loginViaOtp, uniqueEmail } from "./utils/auth";

const storageState = "tests/e2e/.auth/user.json";

/**
 * Logs in once via the real OTP flow (mail catcher) and saves the authenticated
 * session. The browser project reuses this state, so it doubles as the
 * happy-path "login via local mail catcher" coverage required by the testing
 * strategy.
 */
setup("authenticate via email OTP", async ({ page }) => {
  await loginViaOtp(page, uniqueEmail("e2e-session"));
  await page.context().storageState({ path: storageState });
});
