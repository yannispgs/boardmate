import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Optional cookie domain for the Supabase auth session, from
 * `NEXT_PUBLIC_COOKIE_DOMAIN`. Set it to the shared parent (e.g.
 * `.board-mate.app`) on the Vercel **Preview** environment so every
 * `pr-<n>.board-mate.app` preview shares one login instead of re-authenticating
 * on each. Left unset locally and in production → host-only cookies (the
 * default). Safe across environments: dev and prod use different Supabase
 * projects, hence different cookie names (`sb-<ref>-auth-token`), so a
 * shared-domain preview cookie never clashes with the production session.
 */
const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

export const authCookieOptions: CookieOptionsWithName | undefined = domain
  ? { domain }
  : undefined;
