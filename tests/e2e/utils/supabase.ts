import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { localStack } from "./local-env";

/** The Catan boardgame seeded by migrations (min 3 / max 4 players). */
export const CATAN_NAME = "Catan";
export const CATAN_MIN_PLAYERS = 3;
/** Catan's fixed id (from the seed migration) — lets us attach configs to it. */
export const CATAN_ID = "78047bc0-5293-4787-be48-ba7339d48c2d";

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
 * case-insensitive uniqueness) and returns their names in order. Names stay
 * within the 20-char limit (base36 timestamp keeps them short).
 */
export async function seedPlayers(count: number): Promise<string[]> {
  const stamp = Date.now().toString(36);
  const names = Array.from(
    { length: count },
    (_, i) => `E2E J${i + 1}-${stamp}`,
  );

  const { error } = await adminClient()
    .from("players")
    .insert(names.map(name => ({ name })));
  if (error) {
    throw new Error(`Failed to seed players: ${error.message}`);
  }

  return names;
}

/**
 * Inserts a named config for Catan (service role) and returns its name, so the
 * new-game funnel has a config to pick. Values match Catan's template defaults.
 */
export async function seedCatanConfig(name: string): Promise<string> {
  const { error } = await adminClient()
    .from("configs")
    .insert({
      boardgame_id: CATAN_ID,
      name,
      values: {
        pointsToWin: 10,
        longestRoad: true,
        largestArmy: true,
        harborMaster: false,
      },
    });
  if (error) {
    throw new Error(`Failed to seed config: ${error.message}`);
  }

  return name;
}

/** Removes seeded configs by name (service role) — call in a test's `finally`. */
export async function deleteConfigs(names: string[]): Promise<void> {
  await adminClient().from("configs").delete().in("name", names);
}
