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
- No unused exports/vars (ESLint enforces).

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
- Class order is normalized by `prettier-plugin-tailwindcss` (see §7).

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

- ESLint (`eslint-config-next`, flat config) — no warnings left in.
- Prettier for formatting (+ `prettier-plugin-tailwindcss`). _To be added._
- Indentation 2 spaces; double quotes; semicolons (matches the scaffold).
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

---

### Changelog of conventions

- _2026-06-06_ — Initial version (owner asked to follow official best practices
  and keep this file updated on every remark).
- _2026-06-06_ — Always deliver via Pull Requests (owner reviews & merges);
  PR descriptions must recap features/bugs/config/migrations.
