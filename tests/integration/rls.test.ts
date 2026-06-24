import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  anonClient,
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

// Every table in the public schema. RLS must deny the `anon` role on all of
// them (OWASP A01 — broken access control) since the browser ships the public
// anon key; an authenticated session is the only real lock.
const TABLES = [
  "players",
  "boardgames",
  "config_templates",
  "configs",
  "games",
  "game_players",
  "game_turns",
  "auth_rate_limits",
] as const;

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser();
});

afterAll(async () => {
  if (user) await deleteTestUser(user.id);
});

describe("RLS — anonymous access is denied (OWASP A01)", () => {
  it.each(TABLES)("rejects an anonymous insert into %s", async (table) => {
    // Untyped client: the test is generic over the table union and the payload
    // is deliberately empty — RLS must reject before any column validation.
    const anon = anonClient() as SupabaseClient;
    const { error } = await anon.from(table).insert({}).select("*");
    expect(error).not.toBeNull();
    // 42501 = insufficient_privilege (row-level security violation).
    expect(error?.code).toBe("42501");
  });

  it("hides existing rows from an anonymous reader", async () => {
    // Seed a row with the service role (bypasses RLS), then prove `anon`
    // cannot see it while an authenticated user can.
    const admin = serviceClient();
    const { data: seeded, error: seedErr } = await admin
      .from("players")
      .insert({ name: "RLS-hidden-seed" })
      .select("*")
      .single();
    expect(seedErr).toBeNull();
    const seededId = seeded?.id as string;

    try {
      const anonRead = await anonClient().from("players").select("*");
      expect(anonRead.error).toBeNull(); // RLS filters rows, it does not error
      expect(anonRead.data).toEqual([]); // ...so nothing comes back

      const authedRead = await authedClient(user.accessToken)
        .from("players")
        .select("*")
        .eq("id", seededId)
        .maybeSingle();
      expect(authedRead.error).toBeNull();
      expect(authedRead.data?.id).toBe(seededId);
    } finally {
      await admin.from("players").delete().eq("id", seededId);
    }
  });
});

describe("RLS — authenticated CRUD on players", () => {
  it("allows create, read and update", async () => {
    const db = authedClient(user.accessToken);

    const created = await db
      .from("players")
      .insert({ name: "Authed Alice" })
      .select("*")
      .single();
    expect(created.error).toBeNull();
    expect(created.data?.name).toBe("Authed Alice");
    expect(created.data?.is_active).toBe(true);
    const id = created.data?.id as string;

    try {
      const read = await db.from("players").select("*").eq("id", id).single();
      expect(read.error).toBeNull();
      expect(read.data?.id).toBe(id);

      // Deactivation is how players are "removed" from selection.
      const deactivated = await db
        .from("players")
        .update({ is_active: false })
        .eq("id", id)
        .select("*")
        .single();
      expect(deactivated.error).toBeNull();
      expect(deactivated.data?.is_active).toBe(false);
    } finally {
      await serviceClient().from("players").delete().eq("id", id);
    }
  });
});

describe("players deletion — only before they've played", () => {
  it("authenticated can delete a player with no game history", async () => {
    const admin = serviceClient();
    const { data: seeded } = await admin
      .from("players")
      .insert({ name: `Deletable-${Date.now()}` })
      .select("*")
      .single();
    const id = seeded?.id as string;

    const del = await authedClient(user.accessToken)
      .from("players")
      .delete()
      .eq("id", id)
      .select("*");
    expect(del.error).toBeNull();
    expect(del.data?.length).toBe(1); // the row was actually deleted

    const gone = await admin
      .from("players")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    expect(gone.data).toBeNull();
  });

  it("refuses to delete a player who has taken part in a game", async () => {
    // The on-delete-restrict FK from game_players blocks it (23503).
    const admin = serviceClient();
    const pid = (
      await admin
        .from("players")
        .insert({ name: `Played-${Date.now()}` })
        .select("id")
        .single()
    ).data?.id as string;
    const bid = (
      await admin
        .from("boardgames")
        .insert({ name: `BG-${Date.now()}` })
        .select("id")
        .single()
    ).data?.id as string;
    const gid = (
      await admin
        .from("games")
        .insert({ boardgame_id: bid })
        .select("id")
        .single()
    ).data?.id as string;
    await admin
      .from("game_players")
      .insert({ game_id: gid, player_id: pid, seat_order: 0 });

    try {
      const del = await authedClient(user.accessToken)
        .from("players")
        .delete()
        .eq("id", pid)
        .select("*");
      expect(del.error?.code).toBe("23503"); // FK restrict
      const still = await admin
        .from("players")
        .select("id")
        .eq("id", pid)
        .maybeSingle();
      expect(still.data?.id).toBe(pid); // still there
    } finally {
      await admin.from("games").delete().eq("id", gid); // cascades game_players
      await admin.from("boardgames").delete().eq("id", bid);
      await admin.from("players").delete().eq("id", pid);
    }
  });

  it("rejects a duplicate name (case/space-insensitive)", async () => {
    const admin = serviceClient();
    const base = `Uniq-${Date.now()}`;
    const id = (
      await admin.from("players").insert({ name: base }).select("id").single()
    ).data?.id as string;
    try {
      const dup = await authedClient(user.accessToken)
        .from("players")
        .insert({ name: `  ${base.toLowerCase()}  ` })
        .select("*");
      expect(dup.error?.code).toBe("23505"); // unique index violation
    } finally {
      await admin.from("players").delete().eq("id", id);
    }
  });
});

describe("Storage — logos bucket", () => {
  const path = `test/${Date.now()}-logo.txt`;
  const body = new Blob(["fake-logo"], { type: "text/plain" });

  afterAll(async () => {
    await serviceClient().storage.from("logos").remove([path]);
  });

  it("rejects an anonymous upload", async () => {
    const { error } = await anonClient()
      .storage.from("logos")
      .upload(path, body);
    expect(error).not.toBeNull();
  });

  it("accepts an authenticated upload and serves it publicly", async () => {
    const upload = await authedClient(user.accessToken)
      .storage.from("logos")
      .upload(path, body, { upsert: true });
    expect(upload.error).toBeNull();

    // Public bucket: even an anonymous client can list/read the object.
    const list = await anonClient()
      .storage.from("logos")
      .list("test", { search: path.split("/")[1] });
    expect(list.error).toBeNull();
    expect(list.data?.length).toBeGreaterThan(0);
  });
});
