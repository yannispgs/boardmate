import { createBrowserClient } from "@supabase/ssr";

import { requirePublicEnv } from "@/lib/env";

/**
 * Browser-side Supabase client. Uses the public anon key — data protection
 * relies on Row Level Security (RLS) + an authenticated session, not on the
 * key being secret.
 */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
