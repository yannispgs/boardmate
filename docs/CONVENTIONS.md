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
  `npm run lint` (check) and `npm run format` (autofix). Tailwind v4 directives
  are enabled in the CSS parser (`tailwindDirectives`).
- Format: 2-space indent, double quotes, semicolons, 80-col width; imports are
  organized by Biome. No errors/warnings left in.
- **Naming**: React component files `PascalCase.tsx`; other modules
  `kebab-case.ts` / lowercase; identifiers and comments in **English**; JSDoc on
  exported APIs.

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

## 9. Dependencies & versioning

- **No "major-only" ranges** in `package.json` (never `^4`). Pin the **full
  current version** with a caret for non-critical deps (e.g. `^4.3.0`).
- **No caret at all** (exact pin) for **critical deps and/or deps known not to
  follow semver** — e.g. **Next.js** (can break in patch releases) and
  **TypeScript** (a minor can break type-checking).
- Keep `package.json` and `package-lock.json` in sync (run `npm install` after a
  change) and commit the lockfile.

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
