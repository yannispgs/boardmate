import { defineConfig, devices } from "@playwright/test";

import { localStack } from "./tests/e2e/utils/local-env";

/**
 * E2E configuration. Runs a handful of real browser journeys against a locally
 * built app wired to the **local Supabase stack** (`supabase start`) — never a
 * hosted project, mirroring the integration suite. The `setup` project performs
 * one real OTP login (via the mail catcher) and saves the session; the browser
 * project reuses it so the other journeys stay fast.
 */

const { url, anonKey } = localStack();

const PORT = 3000;
const baseURL = `http://127.0.0.1:${PORT}`;

/** Persisted authenticated session, produced by `auth.setup.ts`. */
const storageState = "tests/e2e/.auth/user.json";

export default defineConfig({
  testDir: "./tests/e2e",
  // One worker: the suite is small and shares a single authenticated user and
  // one local database, so serial execution keeps it deterministic.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  // Server Actions can be slow on the first cold request after `next start`,
  // so allow generous time for steps to settle.
  timeout: 90_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    trace: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    { name: "setup", testMatch: /\.setup\.ts$/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState },
      dependencies: ["setup"],
    },
    // WebKit (Safari/iOS engine) runs only in the non-blocking full suite. It's
    // the one that reproduces the iOS-specific quirks Chromium hides (timer
    // throttling, GPU-composited SVG repaints), so it earns its place there.
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], storageState },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "yarn build && yarn start",
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    },
  },
});
