import { defineConfig } from "vitest/config";

// Coverage runs BOTH suites together (unit + integration) so the report
// reflects everything the tests actually exercise. Used by the CI "Coverage"
// job, which boots local Supabase first (the integration project needs it).
export default defineConfig({
  // Resolve the `@/*` path alias from tsconfig (native in Vite 7+).
  resolve: { tsconfigPaths: true },
  test: {
    projects: ["./vitest.config.ts", "./vitest.integration.config.ts"],
    coverage: {
      provider: "v8",
      // text -> CI log; lcov -> uploaded to Codecov (coverage/lcov.info).
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      // Measure the logic layer the suites target. UI under src/app and the
      // shared components are verified via Vercel previews (CONVENTIONS §11),
      // not automated tests; the generated Supabase types aren't ours to cover.
      include: ["src/lib/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "src/lib/supabase/database.types.ts",
        // Client/infra glue exercised via e2e + Vercel previews, not the
        // unit/integration suites (CONVENTIONS §11): React hooks, SDK client
        // factories, proxy/middleware, env loader, composition root, and auth
        // server actions/session. Broaden once e2e tests land.
        "src/lib/hooks/**",
        // auth request-scoped glue (Server Actions, session, the rate-limit
        // wrapper) stays e2e-covered; the pure retry-delay formatter is
        // unit-tested and measured.
        "src/lib/auth/actions.ts",
        "src/lib/auth/session.ts",
        "src/lib/auth/rate-limit.ts",
        "src/lib/supabase/client.ts",
        "src/lib/supabase/server.ts",
        "src/lib/supabase/proxy.ts",
        "src/lib/supabase/cookie-options.ts",
        "src/lib/env.ts",
        "src/lib/repositories/index.ts",
      ],
      // Still emit a report if a test fails, so Codecov always gets one.
      reportOnFailure: true,
    },
  },
});
