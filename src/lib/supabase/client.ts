import { createBrowserClient } from "@supabase/ssr";

import { requirePublicEnv } from "@/lib/env";
import { authCookieOptions } from "@/lib/supabase/cookie-options";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Browser-side Supabase client. Uses the public anon key — data protection
 * relies on Row Level Security (RLS) + an authenticated session, not on the
 * key being secret. Typed with the generated {@link Database} schema so queries
 * are checked end-to-end.
 */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: authCookieOptions,
  });
}
