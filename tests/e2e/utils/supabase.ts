import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { localStack } from "./local-env";

/** The Catan boardgame seeded by migrations (min 3 / max 4 players). */
export const CATAN_NAME = "Catan";
export const CATAN_MIN_PLAYERS = 3;
/** Catan's fixed id (from the seed migration) — lets us attach configs to it. */
export const CATAN_ID = "78047bc0-5293-4787-be48-ba7339d48c2d";

/** Terraforming Mars — played in generations, and the one handing out milestones. */
export const TERRAFORMING_MARS_NAME = "Terraforming Mars";

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
 * Creates `email` as a confirmed account already holding the seeded
 * administrator role, ready for the UI to log into.
 *
 * Since RBAC landed, a freshly-minted account holds **nothing** — every screen
 * would come back empty. The journeys under test are about playing games, not
 * about who may; they run as an administrator so the permission model is
 * asserted where it belongs (the integration suite) instead of colouring every
 * scenario here.
 *
 * The account is created here rather than looked up after the login because
 * that hands back its id directly. Requesting a code for an address that
 * already exists is the same round-trip as for a new one, so the OTP coverage
 * is untouched.
 */
export async function createAdminAccount(email: string): Promise<void> {
  const admin = adminClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    { email, email_confirm: true },
  );
  if (createErr || !created.user) {
    throw new Error(
      `Failed to create ${email}: ${createErr?.message ?? "no user returned"}`,
    );
  }

  const { data: role, error: roleErr } = await admin
    .from("roles")
    .select("id")
    .eq("key", "admin")
    .single();
  if (roleErr) {
    throw new Error(`Failed to find the admin role: ${roleErr.message}`);
  }

  const { error } = await admin
    .from("user_roles")
    .insert({ user_id: created.user.id, role_id: role.id as string });
  if (error) {
    throw new Error(`Failed to grant the admin role: ${error.message}`);
  }
}

/** Nothing local ever holds this many accounts; the cap is a stop, not a limit. */
const MAX_ACCOUNT_PAGES = 50;
const ACCOUNTS_PER_PAGE = 200;

/**
 * Whether the authentication schema holds an account for `email`. Paged
 * through rather than read in one go: a local stack that has been up for a
 * while holds every throwaway address the suite has ever minted.
 */
export async function accountExists(email: string): Promise<boolean> {
  const admin = adminClient();

  for (let page = 1; page <= MAX_ACCOUNT_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: ACCOUNTS_PER_PAGE,
    });

    if (error) {
      throw new Error(`Failed to list accounts: ${error.message}`);
    }

    if (data.users.some(user => user.email === email)) {
      return true;
    }

    if (data.users.length < ACCOUNTS_PER_PAGE) {
      return false;
    }
  }

  return false;
}

/**
 * The id of a seeded boardgame, by name. Only Catan carries a written-down id;
 * every game seeded since draws one at insert, so an id copied out of one
 * database names nothing in the next one.
 */
export async function boardgameId(name: string): Promise<string> {
  const { data, error } = await adminClient()
    .from("boardgames")
    .select("id")
    .eq("name", name)
    .single();

  if (error) {
    throw new Error(`Failed to find boardgame ${name}: ${error.message}`);
  }

  return data.id as string;
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

/**
 * A small but complete Marins map: one strip of six spaces holding four land
 * tiles, two of sea and two harbours. Enough for the generator to draw an
 * island, a coast and a legend, without transcribing a real scenario.
 */
const E2E_BOARD_SPEC = {
  boards: [
    {
      players: [3, 4],
      zones: [
        {
          name: "Archipel",
          cells: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 2, r: 0 },
            { q: 3, r: 0 },
            { q: 4, r: 0 },
            { q: 5, r: 0 },
          ],
          terrainCounts: {
            forest: 1,
            pasture: 1,
            hills: 1,
            mountains: 1,
            sea: 2,
          },
          numberTokens: [4, 5, 6, 9],
          ports: { types: ["generic", "wood"] },
        },
      ],
    },
  ],
};

/**
 * Inserts a Marins scenario carrying a map (service role) and returns its name,
 * so the Marins generator has something to draw — it ships with no scenario of
 * its own.
 */
export async function seedMarinsScenario(name: string): Promise<string> {
  const admin = adminClient();
  const { data: extension } = await admin
    .from("extensions")
    .select("id")
    .eq("key", "catan-marins")
    .single();

  const { error } = await admin.from("extension_scenarios").insert({
    extension_id: extension?.id,
    name,
    target_score: 11,
    sort_order: 99,
    board_spec: { name, targetScore: 11, ...E2E_BOARD_SPEC },
  });
  if (error) {
    throw new Error(`Failed to seed scenario: ${error.message}`);
  }

  return name;
}

/** Removes seeded scenarios by name (service role) — call in a `finally`. */
export async function deleteScenarios(names: string[]): Promise<void> {
  await adminClient().from("extension_scenarios").delete().in("name", names);
}

/**
 * Inserts FAQ entries (service role) and returns their questions, so a played
 * game has rules to read — the app ships with an empty FAQ. A `"catan"` entry
 * hangs off the Catan game, an `"app"` one off nothing (a question about
 * Boardmate itself), which is what a game in progress must *not* show.
 */
export async function seedFaqEntries(
  entries: Array<{ question: string; answer: string; scope: "catan" | "app" }>,
): Promise<string[]> {
  const { error } = await adminClient()
    .from("faq_entries")
    .insert(
      entries.map((entry, i) => ({
        boardgame_id: entry.scope === "catan" ? CATAN_ID : null,
        question: entry.question,
        answer: entry.answer,
        sort_order: i,
      })),
    );
  if (error) {
    throw new Error(`Failed to seed FAQ entries: ${error.message}`);
  }

  return entries.map(entry => entry.question);
}

/** Removes seeded FAQ entries by question — call in a test's `finally`. */
export async function deleteFaqEntries(questions: string[]): Promise<void> {
  await adminClient().from("faq_entries").delete().in("question", questions);
}
