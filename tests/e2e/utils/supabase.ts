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
 *
 * ⚠️ `listUsers` answers 500 « Database error finding users » if any row of
 * `auth.users` was inserted by hand (`confirmation_token` NULL). Every account
 * here is minted through the admin API, so the listing stays readable — a 500
 * means somebody wrote into `auth.users` directly, and `db reset` fixes it.
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
 * Looks the seeded players' ids up by name and hands back a reader for them —
 * what a party written straight into the books needs, since `seedPlayers` only
 * gives back the names it drew.
 */
export async function playerIds(
  names: readonly string[],
): Promise<(name: string) => string> {
  const { data, error } = await adminClient()
    .from("players")
    .select("id, name")
    .in("name", names);

  if (error) {
    throw new Error(`Failed to read the seeded players: ${error.message}`);
  }

  const byName = new Map((data ?? []).map(row => [row.name, row.id as string]));

  return name => byName.get(name) as string;
}

/**
 * A party put straight in the books with the service role, so a scenario can
 * start from a history instead of playing one out. Pass a `sessionId` to file
 * several of them under the same sitting, the way chaining a new party from the
 * score sheet does, and `ongoing` for the deal still on the table.
 *
 * `round` / `stage` are what the statistics read to tell how long a party ran,
 * and `configValues` what it was played to — a party seeded without them looks
 * like a one-lap game, which is right for a scenario that never asks.
 */
export async function seedParty(
  admin: SupabaseClient,
  bgId: string,
  scores: Array<{
    playerId: string;
    score: number | null;
    isWinner?: boolean;
    /** How the total was made up — the two shared piles, on a pair game. */
    breakdown?: Readonly<Record<string, number>>;
  }>,
  options: Readonly<{
    sessionId?: string;
    ongoing?: boolean;
    round?: number;
    turn?: number;
    stage?: number;
    configValues?: Readonly<Record<string, unknown>>;
  }> = {},
): Promise<string> {
  const ongoing = options.ongoing === true;
  const { data: game } = await admin
    .from("games")
    .insert({
      boardgame_id: bgId,
      status: ongoing ? "ongoing" : "ended",
      round: options.round ?? 1,
      turn: options.turn ?? 1,
      current_player_id: ongoing ? scores[0]?.playerId : null,
      ended_at: ongoing ? null : new Date().toISOString(),
      ...(options.sessionId === undefined
        ? {}
        : { session_id: options.sessionId }),
      ...(options.stage === undefined ? {} : { stage: options.stage }),
      ...(options.configValues === undefined
        ? {}
        : { config_values: options.configValues }),
    })
    .select("id")
    .single();
  const gameId = game?.id as string;

  await admin.from("game_players").insert(
    scores.map((s, seat) => ({
      game_id: gameId,
      player_id: s.playerId,
      seat_order: seat,
      is_winner: s.isWinner === true,
      score: s.score,
      ...(s.breakdown === undefined ? {} : { score_breakdown: s.breakdown }),
    })),
  );

  return gameId;
}

/**
 * The turns of a party already in the books — what makes it a party someone
 * *played* rather than one keyed in after the fact, and what every reading of
 * time divides. A `playerId` of `null` is a turn the whole table took at once
 * (a simultaneous game), owned by nobody.
 */
export async function seedTurns(
  admin: SupabaseClient,
  gameId: string,
  turns: ReadonlyArray<{
    playerId: string | null;
    round: number;
    turnNo: number;
    durationS: number;
  }>,
): Promise<void> {
  const { error } = await admin.from("game_turns").insert(
    turns.map(t => ({
      game_id: gameId,
      player_id: t.playerId,
      round: t.round,
      turn_no: t.turnNo,
      duration_s: t.durationS,
    })),
  );

  if (error) {
    throw new Error(`Failed to seed the turns: ${error.message}`);
  }
}

/**
 * The barème of a game whose scale really moves with the table: a plain total,
 * highest takes it, read separately at each size. Several scenarios need a game
 * like that and none of them needs a different one — records, recaps and table
 * pills all hang off `playerCountSensitive`.
 */
export const TABLE_SENSITIVE_SCORING = {
  timing: "final",
  entry: "total",
  winCondition: { type: "highest" },
  playerCountSensitive: true,
} as const;

/**
 * Turns a row of figures into a seatful of players, highest taking the win —
 * the shape `seedParty` asks for. Fewer figures than players seats a smaller
 * table, which is how a duel is slipped into a three-player game's history.
 */
export function scoreTable(
  players: readonly string[],
  idOf: (name: string) => string,
) {
  return (scores: readonly number[]) => {
    return players.slice(0, scores.length).map((name, seat) => ({
      playerId: idOf(name),
      score: scores[seat],
      isWinner: scores[seat] === Math.max(...scores),
    }));
  };
}

/**
 * A throwaway boardgame, for a scenario that needs a barème of its own rather
 * than a real game's. Seeding one is what keeps a test from breaking the day a
 * real game's scoring is changed — which has happened.
 */
export async function seedBoardgame(
  admin: SupabaseClient,
  fields: Readonly<{
    name: string;
    minPlayers?: number;
    maxPlayers?: number;
    roundLimit?: number | null;
    scoring?: Readonly<Record<string, unknown>>;
    /**
     * Whether the app runs a clock on the turns. ⚠️ The column defaults to
     * `true`, so a game seeded without saying otherwise DOES get the « La
     * partie » panel on the finished screen — pass `false` for a scenario that
     * must not have one (Papayoo's kind).
     */
    isTimed?: boolean;
    /** `"simultaneous"` for a game whose table plays each lap at once (Splito). */
    turnMode?: "sequential" | "simultaneous";
  }>,
): Promise<string> {
  const { data, error } = await admin
    .from("boardgames")
    .insert({
      name: fields.name,
      min_players: fields.minPlayers ?? 1,
      max_players: fields.maxPlayers ?? 4,
      ...(fields.isTimed === undefined ? {} : { is_timed: fields.isTimed }),
      ...(fields.turnMode === undefined ? {} : { turn_mode: fields.turnMode }),
      ...(fields.roundLimit === undefined
        ? {}
        : { round_limit: fields.roundLimit }),
      ...(fields.scoring === undefined ? {} : { scoring: fields.scoring }),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Failed to seed boardgame ${fields.name}: ${error.message}`,
    );
  }

  return data.id as string;
}

/**
 * Undoes what a scenario seeded, in the order the foreign keys allow: the
 * parties first, then the games they were played on, then the players. Meant
 * for a `finally`, so it never throws — a fixture left behind is a nuisance,
 * a masked assertion failure is a lie.
 */
export async function dropSeeded(
  admin: SupabaseClient,
  seeded: Readonly<{
    games?: ReadonlyArray<string | null>;
    boardgames?: ReadonlyArray<string | null>;
    playerNames?: readonly string[];
  }>,
): Promise<void> {
  for (const id of seeded.games ?? []) {
    if (id !== null) {
      await admin.from("games").delete().eq("id", id);
    }
  }

  for (const id of seeded.boardgames ?? []) {
    if (id !== null) {
      await admin.from("boardgames").delete().eq("id", id);
    }
  }

  if (seeded.playerNames !== undefined) {
    await admin.from("players").delete().in("name", seeded.playerNames);
  }
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
