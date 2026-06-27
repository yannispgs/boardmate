import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { localStack } from "./local-env";

/** The Catan boardgame seeded by migrations (min 3 / max 4 players). */
export const CATAN_NAME = "Catan";
export const CATAN_MIN_PLAYERS = 3;

/**
 * Service-role client — **BYPASSES RLS**. Used only to seed/clean e2e fixtures
 * (players for a game), never as the app's client and never asserted against.
 */
export function adminClient(): SupabaseClient {
  const { url, serviceRoleKey } = localStack();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Inserts `count` active players with unique names (the DB enforces
 * case-insensitive uniqueness) and returns their names in order.
 */
export async function seedPlayers(count: number): Promise<string[]> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const names = Array.from(
    { length: count },
    (_, i) => `E2E Joueur ${i + 1} ${stamp}`,
  );

  const { error } = await adminClient()
    .from("players")
    .insert(names.map(name => ({ name })));
  if (error) {
    throw new Error(`Failed to seed players: ${error.message}`);
  }

  return names;
}
