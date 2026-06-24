import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the `@/*` path alias from tsconfig (native in Vite 7+).
  resolve: { tsconfigPaths: true },
  test: {
    name: "unit",
    // Pure-logic tests (domain, config validation) — no DOM needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
