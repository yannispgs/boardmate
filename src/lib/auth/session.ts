import { createClient } from "@/lib/supabase/server";

/** Minimal authenticated-user view exposed to the app (no vendor types leak). */
export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * The current authenticated user, or `null`. Uses `getUser()` (which validates
 * the token with Supabase) rather than reading the session cookie blindly.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }
  return { id: user.id, email: user.email ?? null };
}
