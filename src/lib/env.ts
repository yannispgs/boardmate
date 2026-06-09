/**
 * Public (browser-exposed) environment variables.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time. We validate lazily (at call
 * time) so a missing value fails fast where it is used, not at import time.
 */
export function requirePublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).",
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}
