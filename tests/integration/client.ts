import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { localSupabaseEnv } from "./env";

const noPersist = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

/** Anonymous client (Postgres role `anon`) — unauthenticated, public anon key. */
export function anonClient(): SupabaseClient<Database> {
  const { url, anonKey } = localSupabaseEnv();
  return createClient<Database>(url, anonKey, noPersist);
}

/**
 * Service-role client — **BYPASSES RLS**. Use only for test setup/teardown
 * (seeding/cleanup); never as the subject of an access-control assertion.
 */
export function serviceClient(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = localSupabaseEnv();
  return createClient<Database>(url, serviceRoleKey, noPersist);
}

/** Client carrying a user's access token (Postgres role `authenticated`). */
export function authedClient(accessToken: string): SupabaseClient<Database> {
  const { url, anonKey } = localSupabaseEnv();
  return createClient<Database>(url, anonKey, {
    ...noPersist,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

/**
 * Mints a real authenticated session entirely server-side (no inbox needed):
 * admin-creates a confirmed user, then signs in to obtain an access token.
 */
export async function createTestUser(): Promise<TestUser> {
  const admin = serviceClient();
  const email = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const password = "test-password-123456";

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    { email, password, email_confirm: true },
  );
  if (createErr || !created.user) {
    throw createErr ?? new Error("admin.createUser returned no user");
  }

  const { data: signIn, error: signInErr } =
    await anonClient().auth.signInWithPassword({ email, password });
  if (signInErr || !signIn.session) {
    throw signInErr ?? new Error("signInWithPassword returned no session");
  }

  return {
    id: created.user.id,
    email,
    accessToken: signIn.session.access_token,
  };
}

/** Removes a test user created with {@link createTestUser}. */
export async function deleteTestUser(id: string): Promise<void> {
  await serviceClient().auth.admin.deleteUser(id);
}
