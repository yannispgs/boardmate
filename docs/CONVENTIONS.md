# Coding conventions — Boardmate

Living document. It records the coding practices followed on this project, based
on the **official** guidance of each tool when it exists, and reputable sources
otherwise. **Updated on every remark from the project owner.**

> Sources of truth: Next.js docs (bundled in `node_modules/next/dist/docs/`),
> React docs (react.dev), TypeScript handbook, Tailwind CSS docs, Supabase docs,
> Zod docs.

## 0. Golden rules

- Follow the official best practices of the tool in use. Prefer official docs;
  fall back to reputable, authoritative sources.
- ⚠️ **Next 16 has breaking changes vs. older knowledge** (see `AGENTS.md`).
  Consult `node_modules/next/dist/docs/` before writing Next-specific code.
- Keep changes small, typed, and verified (`tsc --noEmit` + `next build` green).

## 1. TypeScript

- `strict` mode is on. No `any` — use `unknown` + narrowing, or precise types.
- Use **type-only imports**: `import type { Foo } from "..."`.
- Model invariants with **discriminated unions** and **branded types**
  (e.g. `PlayerId`) rather than bare strings.
- Prefer `interface` for object shapes, `type` for unions/aliases.
- No unused exports/vars (Biome enforces).

## 2. React 19 / Next.js 16 (App Router)

- **Server Components by default.** Add `"use client"` only when the file needs
  state, effects, event handlers, or browser-only APIs.
- `params` and `searchParams` are **async** — `await` them.
- `app/` is for **routing only** (`page`, `layout`, `route`, `loading`,
  `error`, `manifest`, metadata files). Shared code lives outside `app/` under
  `src/lib`, `src/components`, `src/hooks`. Colocate route-only files in a
  private folder (`_components`, `_lib`).
- Use the framework primitives: `next/link`, `next/image`, `next/font`.
- Metadata via `export const metadata` / `viewport`; PWA via `app/manifest.ts`.
- Data access goes through the **repository interfaces**, never a vendor SDK in
  UI/hooks (see §6).

## 3. Tailwind CSS v4

- Utility-first, CSS-first config (`@import "tailwindcss"` in `globals.css`).
- Prefer design tokens/scale over arbitrary values (`p-4` over `p-[17px]`)
  unless there is a real reason.
- Tailwind class sorting is not auto-enforced yet (Biome's `useSortedClasses`
  is a nursery rule we may enable later).

## 4. Supabase

- Use `@supabase/ssr` for Next (separate browser and server clients).
- The browser uses the **anon public** key; **never** ship the `service_role`
  key to the client. Real security = **RLS** + an authenticated session.
- DB types are generated (`supabase gen types typescript`) and fed to the client
  generic, so queries are typed.
- Schema changes are **versioned SQL migrations** under `supabase/migrations/`.

## 5. Zod

- Single source of truth for runtime validation at trust boundaries (config
  values, forms, external input). Derive TS types with `z.infer` where useful.
- Zod **v4** API.

## 6. Architecture (anti-lock-in)

- Layered: `UI → hooks → repository interface → vendor adapter`.
- `src/lib/domain` is **pure** (no vendor imports).
- The Supabase SDK is confined to `src/lib/supabase` and the repository adapter.
  Swapping the backend should mean rewriting only the adapter.

## 7. Formatting, linting, naming

- **Biome** (Rust) is the single linter **and** formatter — it replaces ESLint
  and Prettier (chosen for speed + stability). Config: `biome.json`. Run
  `yarn lint` (check) and `yarn format` (autofix). Tailwind v4 directives
  are enabled in the CSS parser (`tailwindDirectives`).
- Format: 2-space indent, double quotes, semicolons, 80-col width; imports are
  organized by Biome. No errors/warnings left in.
- **Naming**: React component files `PascalCase.tsx`; other modules
  `kebab-case.ts` / lowercase; identifiers and comments in **English**; JSDoc on
  exported APIs.
- **Style conventions (owner, 2026-06-24):**
  1. **Never an inline `return`** — control-flow bodies always use braces +
     newline + indentation, even for a lone `return`. _Enforced by Biome
     (`style/useBlockStatements`)._
  2. **No parentheses around a single arrow-function parameter** (`x => …`, not
     `(x) => …`). _Enforced by Biome (`arrowParentheses: "asNeeded"`)._
  3. **Blank lines** (Biome can't enforce — apply by hand): one blank line
     **before every `return`**, and **before & after each `if` / `for` / `try`
     block** and each **group of `expect(...)`** in tests — _except_ when there
     is no other statement before/after at that indentation level.

## 8. Git & pull requests

- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`…).
- Work on feature branches; the default branch is `main`.
- **Always ship through a Pull Request.** Never push/merge straight to `main`.
  The owner reviews and merges every PR himself (review + ownership).
- **PR description** must recap the change: features added, bugs fixed,
  configuration/tooling updates, migrations, and anything notable to review.
- **Tooling / dependency swaps go in their own `chore/` branch + PR** (e.g.
  changing the linter/formatter), kept separate from feature work, with a
  `chore` commit type.

## 9. Package manager & dependencies

- **Package manager: Yarn 4** (Berry), pinned via the `packageManager` field and
  run through **Corepack** (`corepack enable`). `nodeLinker: node-modules` (in
  `.yarnrc.yml`) for maximum compatibility with Next.js — no Plug'n'Play.
- **Node 24** is the supported runtime (`engines.node`, `.nvmrc`). Use it locally
  and in CI.
- Install/update with `yarn install` (use `yarn install --immutable` in CI).
  Keep `package.json` and **`yarn.lock`** in sync and commit the lockfile.
- **No "major-only" ranges** in `package.json` (never `^4`). Pin the **full
  current version** with a caret for non-critical deps (e.g. `^4.3.0`).
- **No caret at all** (exact pin) for **critical deps and/or deps known not to
  follow semver** — e.g. **Next.js** (can break in patch releases) and
  **TypeScript** (a minor can break type-checking).
- When **updating** a dependency or tool, move to the **latest available
  version** (newest major included), not just the latest patch of the current
  major.

## 10. CI / CD

- **CI** (GitHub Actions, `.github/workflows/ci.yml`): every PR and every push
  to `main` enables Corepack, sets up **Node 24**, runs `yarn install
  --immutable`, then Biome (`yarn lint`), `yarn tsc --noEmit`, and `yarn build`.
- **GitHub Actions security**: every `uses:` is pinned to a **full commit SHA**,
  with the human-readable version in a trailing comment
  (e.g. `actions/checkout@<sha> # v6.0.3`). Never reference an action by a
  mutable tag (`@v6`, `@main`) — a tag can be repointed to malicious code, a
  commit digest is immutable. When bumping, take the latest version (see §9).
- **Releases & CHANGELOG**: automated with **release-please**
  (`.github/workflows/release-please.yml` + `release-please-config.json` +
  `.release-please-manifest.json`). It reads Conventional Commits on `main`,
  keeps an open **release PR** that bumps the SemVer version + regenerates
  `CHANGELOG.md`, and on merge tags the commit and publishes a GitHub Release.
  The owner merges the release PR like any other. Pre-1.0: breaking changes bump
  the **minor** (`bump-minor-pre-major`). Never hand-edit `CHANGELOG.md` or the
  version in `package.json` — release-please owns them.
- **CD**: deployment on **Vercel** via its native Git integration (preview
  deploy per PR, production on `main`).
- **Per-PR preview URL**: every PR is reachable at a stable, predictable
  **`https://pr-<number>.board-mate.app`** (our own domain). A workflow
  (`.github/workflows/pr-preview-alias.yml`) waits for Vercel's preview build
  and aliases it to that name, so reviewers never hunt for a random hash URL.
  Needs the `VERCEL_API_TOKEN` repo secret. Previews run against the **dev**
  Supabase backend (Preview env); production (`main`) uses the prod backend.

## 11. Testing

Test at the layer where the risk lives, not "everything". Two suites, kept
separate so the fast one never needs a database:

- **Unit (`yarn test`)** — **Vitest**, `node` env, **no DB**. Covers pure logic:
  dynamic Zod/`FieldSpec` config validation, and later the turn/round engine and
  time aggregation. Config: `vitest.config.ts` (`src/**/*.test.ts`). Runs in the
  `Unit tests` CI job with no services.
- **Integration / RLS (`yarn test:integration`)** — **Vitest** against a **local
  Supabase** stack (`supabase start`, Docker), **never a hosted project**. Config:
  `vitest.integration.config.ts` (`tests/integration/**/*.test.ts`, serial). These
  assert the real security model: **RLS denies the `anon` role on every table**
  (OWASP **A01**), authenticated CRUD works, **players are never deletable** (no
  DELETE policy → a delete affects zero rows and the row survives — _not_ an
  error), and the `logos` bucket is public-read / authenticated-write. Real
  authenticated sessions are minted server-side (`auth.admin.createUser` +
  `signInWithPassword`) — **no inbox needed**. Local Supabase ships fixed default
  keys, so **no secrets** are required; connection details come from
  `supabase status` (`tests/integration/env.ts`). Runs in the
  `Integration & RLS tests` CI job, which boots `supabase start` on the runner.
- **E2E (`yarn test:e2e`)** — a **few** **Playwright** journeys only, run in a
  real Chromium against the app **built and served locally** and wired to the
  **local Supabase** stack (`supabase start`, Docker) — never a hosted project.
  Config: `playwright.config.ts` (`tests/e2e/**`, one worker). A `setup` project
  performs **one real OTP login via the mail catcher** (the local stack catches
  email in **Mailpit**, exposed as `INBUCKET_URL`) and saves the session
  (`storageState`); the browser project reuses it so the other journeys stay
  fast. Covered paths: login (happy via mail catcher + invalid-code + the proxy
  redirecting anonymous visitors to `/login`, OWASP **A01/A07**), the player
  lifecycle (create → deactivate → reactivate), and **one full game** (new-game
  funnel → play screen → advance a turn → end → winner). Fixtures (players) are
  seeded with the **service role**, mirroring the integration suite; **no
  secrets** are required (local Supabase ships fixed default keys; connection
  details come from `supabase status`). Runs in the **E2E tests** CI job
  (`yarn playwright install --with-deps chromium` + `supabase start`); kept
  **non-blocking initially** while its stability is judged.
- **Skip**: per-component/snapshot tests, mocking the Supabase client,
  perf/load, visual-regression (Vercel preview + occasional screenshot suffices).

---

### Changelog of conventions

- _2026-06-06_ — Initial version (owner asked to follow official best practices
  and keep this file updated on every remark).
- _2026-06-06_ — Always deliver via Pull Requests (owner reviews & merges);
  PR descriptions must recap features/bugs/config/migrations.
- _2026-06-07_ — Replaced ESLint (and the planned Prettier) with **Biome**
  (single, much faster lint + format tool).
- _2026-06-07_ — Players are **never deleted** from the DB — only deactivated
  (`is_active`), which removes them from selection lists while preserving
  history/stats.
- _2026-06-07_ — Dependency versioning: full-version carets for non-critical
  deps; exact pins (no caret) for critical / non-semver deps (Next, TypeScript).
- _2026-06-07_ — Tooling / dependency swaps go in a dedicated `chore/` PR,
  separate from feature PRs.
- _2026-06-07_ — Added CI (GitHub Actions: Biome + `tsc` + build); CD on Vercel
  documented (native Git integration, set up at the deployment phase).
- _2026-06-09_ — Pin every GitHub Actions `uses:` to a full commit SHA (version
  in a trailing comment) to prevent supply-chain attacks via mutable tags.
- _2026-06-09_ — When updating a dependency/tool, take the latest available
  version (newest major included).
- _2026-06-09_ — Switched the package manager to **Yarn 4** (Corepack,
  `nodeLinker: node-modules`) and the runtime to **Node 24** (`engines`,
  `.nvmrc`, CI). Lockfile is now `yarn.lock`; CI uses `yarn install --immutable`.
- _2026-06-10_ — Automated versioning + CHANGELOG with **release-please**
  (Conventional-Commits-driven release PR; owner merges it). SemVer, pre-1.0
  breaking → minor bump.
- _2026-06-11_ — Testing strategy (§11): split **unit** (`yarn test`, no DB) from
  **integration/RLS** (`yarn test:integration`, local Supabase via Docker); the
  latter enforces the RLS/access-control model (OWASP A01) in a dedicated CI job.
- _2026-06-24_ — Style conventions (§7): no inline `return` (always braces,
  Biome `useBlockStatements`); no parens around a single arrow param
  (`arrowParentheses: "asNeeded"`); blank lines around `return`/`if`/`for`/`try`
  and `expect` groups (manual — Biome has no equivalent rule).
- _2026-06-27_ — Implemented the **E2E** suite (§11): **Playwright** (`yarn
  test:e2e`) against the locally built app + local Supabase, with one real OTP
  login via the mail catcher (Mailpit) saved as `storageState` and reused; paths
  = login (+ anon redirect / invalid code), player lifecycle, one full game.
  New **E2E tests** CI job, non-blocking initially.
