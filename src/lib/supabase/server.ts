import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requirePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Server
 * Actions). Reads/writes the session from the request cookies. Like the browser
 * client it uses the public anon key — security relies on RLS + the session.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` was called from a Server Component, where cookies are
          // read-only. Safe to ignore: the proxy refreshes the session cookie.
        }
      },
    },
  });
}
