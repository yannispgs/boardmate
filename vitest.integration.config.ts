import { defineConfig } from "vitest/config";

// Integration / RLS tests: these run against a LOCAL Supabase stack
// (`supabase start`), never the hosted projects. Kept separate from the unit
// config so `yarn test` stays DB-free and fast.
export default defineConfig({
  // Resolve the `@/*` path alias from tsconfig (native in Vite 7+).
  resolve: { tsconfigPaths: true },
  test: {
    name: "integration",
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // A global setup loads the local Supabase connection details into env.
    globalSetup: ["tests/integration/global-setup.ts"],
    // The DB is shared state — run files serially to keep assertions
    // deterministic (each test cleans up after itself, but no parallel writes).
    fileParallelism: false,
    // Booting/seeding can be slow on first run.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
