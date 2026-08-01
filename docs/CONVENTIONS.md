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
- **Accessibility / WCAG is out of scope** (owner decision): the whole Biome
  `a11y` rule category is **off** (`linter.rules.a11y: "off"`). Don't add ARIA
  roles/labels, keyboard handlers, etc. just to satisfy those rules — it's a
  small private app for a known audience. Add such attributes only when they're
  genuinely useful (e.g. a test hook), not for compliance.
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
- **PR description** must recap the change from the **user's point of view**,
  grouped by view (see the review below); no test/validation section.
- **CI/CD flag (first line) + `configuration` label.** When a PR touches
  **CI/CD configuration or CI tooling configuration**, start the description with
  a short flag **and add the `configuration` label** to the PR, so the owner
  knows to review the file diff himself (he otherwise trusts the conventions +
  Sonar and does **not** read application code). This covers changes to
  `.github/workflows/**`, `.github/actions/**`, `biome.json`, `tsconfig*`,
  `package.json` scripts/deps, `vitest*.config.ts`, `playwright.config.ts`,
  release-please, Sonar/Codecov config, etc. It does **not** cover merely adding
  or editing tests (`tests/**`, `*.test.ts`) — those are source code and need
  neither the flag nor the label.
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
  version in `package.json` — release-please owns them. **Tag format**: plain
  `vX.Y.Z` (e.g. `v1.0.0`) with no component prefix — `include-v-in-tag: true` +
  `include-component-in-tag: false`; the GitHub Release is named after that tag.
- **CD**: deployment on **Vercel** via its native Git integration (preview
  deploy per PR, production on `main`).
- **Per-PR preview URL**: every PR is reachable at a stable, predictable
  **`https://pr-<number>.board-mate.app`** (our own domain). A workflow
  (`.github/workflows/pr-preview-domain.yml`) attaches, when the PR **opens**, a
  Vercel domain **linked to the PR's Git branch** (`gitBranch`); Vercel then
  serves that branch's latest READY deployment on the domain automatically for
  every later push — **no run per commit**. The domain is **deleted when the PR
  closes/merges**, so it's **two runs per PR** total (attach + detach). Keyed on
  the unique PR number → names never collide; a renamed branch just means a new
  PR. Same effect is reproducible by hand (GitHub down / no token): add
  `pr-<n>.board-mate.app` in the Vercel project's Domains with Git Branch = the
  PR branch, and remove it after. Needs the `VERCEL_API_TOKEN` repo secret and
  the `VERCEL_TEAM_ID` / `VERCEL_PROJECT_ID` / `PREVIEW_BASE_DOMAIN` repo
  variables. Previews run against the **dev** Supabase backend (Preview env);
  production (`main`) uses the prod backend.
- **Shared preview session**: set `NEXT_PUBLIC_COOKIE_DOMAIN=.board-mate.app`
  on the Vercel **Preview** environment (only) so the Supabase auth cookie is
  scoped to the parent domain — one login is then shared across every
  `pr-<n>.board-mate.app` preview instead of re-authenticating on each. Leave it
  **unset** for production and locally (host-only cookies). Safe: dev and prod
  are different Supabase projects, so their cookie names differ
  (`sb-<ref>-auth-token`) and never collide. The value is read in
  `src/lib/supabase/cookie-options.ts` and applied to all three SDK clients.

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
  details come from `supabase status`).
  - **Two tiers.** The **critical** journeys are tagged `@critical` (login
    happy/invalid/anon-redirect, player lifecycle, one full game). They run
    **per-PR** on **both Chromium and WebKit** (Safari/iOS engine — where the
    bugs Chromium hides live), as **parallel matrix jobs** (`E2E critical
    (chromium)` / `(webkit)`) so the second engine adds coverage at **no extra
    wall-clock**; each runs `playwright test --project=<engine> --grep
    @critical`. These gate merges. On top, the **full** suite
    (`yarn test:e2e:full`) runs **every** scenario on both engines in a
    **separate, non-blocking** workflow (`e2e-full.yml`) triggered on **push to
    `main`** (post-merge) and `workflow_dispatch`. Public repo → free Actions
    minutes, so the wide sweep costs nothing and never blocks a merge.
  - Scripts: `yarn test:e2e` (Chromium, all tests — local default),
    `yarn test:e2e:full` (all projects, CI), `yarn test:e2e:ui`. New exhaustive
    scenarios are added **untagged** so they run only in the full suite; promote
    one to `@critical` when it becomes a must-pass gate.
- **Coverage (`yarn test:coverage`)** — Vitest v8, **unit + integration merged**,
  scoped to `src/lib/**` (`vitest.coverage.config.ts`), uploaded to Codecov. The
  UI (`src/app`) and request-scoped glue (React hooks, SDK client/server
  factories, proxy, env loader, composition root, auth Server Actions/session)
  are **excluded** — they're covered by e2e + Vercel previews, not the
  unit/integration suites. **Target: 100%** on what remains. Genuinely
  untestable-without-fault-injection code is marked, not faked:
  **`/* c8 ignore … */`** on (a) the Realtime `subscribe()` channel glue, (b)
  defensive DB-error guards (`if (error) throw …` on healthy selects/updates),
  and (c) defensive `?? null` / `|| …` fallbacks — each with a one-line reason.
  Never mock the Supabase client to hit a branch; either trigger it for real
  (constraint violations, not-found) or `c8 ignore` it with justification. Pure
  logic buried in a glue file is **extracted** to its own module so it can be
  unit-tested and measured (e.g. `auth/retry-delay.ts` out of `rate-limit.ts`).
- **Skip**: per-component/snapshot tests, mocking the Supabase client,
  perf/load, visual-regression (Vercel preview + occasional screenshot suffices).

## 12. Dates & times

**Stored in UTC, always shown in the reader's local time.** An instant is one
point on the timeline; the calendar it is read on is the reader's, not the
server's.

- **Storing**: `timestamptz` columns, written as `new Date().toISOString()`.
  Never store a wall-clock string, never store a local offset.
- **Showing**: format in the browser — `toLocaleString`/`toLocaleDateString` or
  an `Intl.DateTimeFormat`, in `"fr-FR"`. **Never** derive a displayed date from
  `toISOString()` or `getUTC*()`: that prints the UTC day, so a game played at
  1 a.m. in Paris shows up as the day before.
- **Filing under a day** (date filters, per-day counts, chart buckets):
  `localDay(instant)` in `src/lib/game/game-filters.ts`, which reads the local
  calendar. `<input type="date">` gives a **local** day, so both sides of a
  comparison must be local ones.
- **Reading a day back into an instant**: parse it as local (`new
  Date("2026-07-28T12:00:00")`, no `Z`) and store the ISO string. Midday, not
  midnight — an offset can then never push it onto the neighbouring day.
- **Formatting stays client-side.** The server runs in UTC (Vercel), so a date
  formatted during SSR would be the UTC one for one paint, then flip on
  hydration. Timestamps therefore live in `"use client"` components fed by the
  hooks, never rendered from a Server Component.

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
- _2026-07-01_ — Split E2E into two tiers (§11): **critical** journeys tagged
  `@critical` run per-PR on **Chromium + WebKit** as parallel matrix jobs
  (blocking gate, `--project=<engine> --grep @critical`; WebKit is free
  wall-clock and catches iOS-only bugs); a **full** suite (`yarn test:e2e:full`,
  all scenarios on both engines) runs non-blocking on push to `main` and on
  demand via a separate `e2e-full.yml` workflow. New scenarios are added
  untagged (full-only) until promoted.
- _2026-07-01_ — Coverage target is **100%** on the measured `src/lib/**` scope
  (§11): reach it with real unit/integration tests, and mark the rest with
  documented `/* c8 ignore … */` (Realtime `subscribe()` glue, defensive
  DB-error guards, `?? null`/`|| …` fallbacks) — **never** by mocking the
  Supabase client. Extract pure logic out of glue files to unit-test it
  (`auth/retry-delay.ts`).
- _2026-07-04_ — **Accessibility / WCAG out of scope** (§7): disabled Biome's
  whole `a11y` rule category (`linter.rules.a11y: "off"`). Owner's call — small
  private app for a known audience; don't add ARIA/keyboard handling just for
  compliance.
- _2026-07-12_ — Release tags are plain `vX.Y.Z` with no component prefix
  (§10): set `include-component-in-tag: false` (kept `include-v-in-tag: true`),
  so v1 tags as `v1.0.0` instead of `boardmate-v1.0.0`. Owner's call.
- _2026-07-20_ — Per-PR preview URL now uses a **branch-linked Vercel domain**
  instead of per-commit aliasing (§10): `pr-preview-domain.yml` attaches
  `pr-<n>.board-mate.app` (with `gitBranch`) on PR open and deletes it on
  close/merge — **two runs per PR** instead of one per commit, and trivially
  reproducible by hand in the Vercel dashboard. Owner's call (matches a pattern
  he runs elsewhere; fewer runs, easier manual fallback).
- _2026-07-20_ — **CI/CD flag at the top of PR descriptions + `configuration`
  label** (§8): a PR that touches CI/CD or CI-tooling **configuration** must flag
  it on the first line **and carry the `configuration` label** so the owner
  reviews the diff; source-only PRs (incl. test changes) need neither — he trusts
  the conventions + SonarCloud. Owner's call.
- _2026-07-28_ — **Dates & times** (new §12): store instants in **UTC**
  (`timestamptz` + `toISOString()`), display them **always in the reader's local
  time** (`toLocaleString`/`Intl`, client-side), and file a game under its
  **local** day (`localDay`) — never the UTC one. Owner's call, after a game
  played after midnight was listed on the day before.
