import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuditRepository } from "@/lib/supabase/repositories/audit";
import {
  anonClient,
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

// The history is the one table nothing in the application may write, and the
// one whose contents decide whether an incident can be reconstructed. Both
// halves are asserted here against the real database: what gets recorded, and
// that nobody can rewrite it.

let admin: TestUser;

beforeAll(async () => {
  admin = await createTestUser();
});

afterAll(async () => {
  if (admin) {
    await deleteTestUser(admin.id);
  }
});

/** Every history line about one row, newest first. */
async function linesAbout(table: string, recordId: string) {
  const { data } = await serviceClient()
    .from("audit_log")
    .select("*")
    .eq("table_name", table)
    .eq("record_id", recordId)
    .order("id", { ascending: false });

  return data ?? [];
}

/**
 * A player name that fits the table's 20-character cap, with room left for a
 * suffix. A name over the cap is rejected by a check constraint, and a write
 * that never happened writes no history — which reads exactly like a trigger
 * that failed to fire.
 */
function shortName(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

describe("audit — what an administrative write leaves behind", () => {
  it("records the author, the row's name and the columns that moved", async () => {
    const db = authedClient(admin.accessToken);
    const name = shortName("Aud");
    const { data: created, error } = await db
      .from("players")
      .insert({ name })
      .select("*")
      .single();

    expect(error).toBeNull();

    const playerId = created?.id as string;

    try {
      const renamed = await db
        .from("players")
        .update({ name: `${name}b` })
        .eq("id", playerId);

      expect(renamed.error).toBeNull();

      const lines = await linesAbout("players", playerId);
      const [update, insert] = lines;

      expect(lines).toHaveLength(2);

      expect(insert.action).toBe("insert");
      expect(insert.record_label).toBe(name);
      expect(insert.actor_id).toBe(admin.id);
      expect(insert.actor_email).toBe(admin.email);
      expect(insert.actor_roles).toEqual(["Administrateur"]);
      expect(insert.channel).toBe("app");
      expect(insert.simulated).toBe(false);

      expect(update.action).toBe("update");
      expect(update.changed_keys).toEqual(["name"]);
      expect((update.old_value as { name: string }).name).toBe(name);
      expect((update.new_value as { name: string }).name).toBe(`${name}b`);
    } finally {
      await serviceClient().from("players").delete().eq("id", playerId);
    }
  });

  it("says nothing when a save changes nothing", async () => {
    const db = authedClient(admin.accessToken);
    const name = shortName("Noop");
    const { data: created, error } = await db
      .from("players")
      .insert({ name })
      .select("*")
      .single();

    expect(error).toBeNull();

    const playerId = created?.id as string;

    try {
      const saved = await db
        .from("players")
        .update({ name })
        .eq("id", playerId);

      expect(saved.error).toBeNull();

      const lines = await linesAbout("players", playerId);

      expect(lines).toHaveLength(1);
      expect(lines[0].action).toBe("insert");
    } finally {
      await serviceClient().from("players").delete().eq("id", playerId);
    }
  });

  it("names a simulation after the roles looked through, not after its author", async () => {
    const service = serviceClient();
    const suffix = Date.now().toString(36);
    const { data: roles } = await service
      .from("roles")
      .insert([
        { key: `sim-b-${suffix}`, label: `Sim B ${suffix}` },
        { key: `sim-a-${suffix}`, label: `Sim A ${suffix}` },
      ])
      .select("id");
    const roleIds = (roles ?? []).map(role => role.id);

    try {
      const db = authedClient(admin.accessToken);
      const started = await db.rpc("start_role_simulation", {
        p_role_ids: roleIds,
      });

      expect(started.error).toBeNull();

      await db.rpc("stop_role_simulation");

      const [stop, start] = await linesAbout(
        "permission_simulations",
        admin.id,
      );

      // The author is on the line already; the name says which view it was,
      // in the same order whichever way the roles were picked.
      expect(start.action).toBe("insert");
      expect(start.actor_email).toBe(admin.email);
      expect(start.record_label).toBe(`Sim A ${suffix} + Sim B ${suffix}`);

      expect(stop.action).toBe("delete");
      expect(stop.record_label).toBe(start.record_label);
    } finally {
      await service
        .from("permission_simulations")
        .delete()
        .eq("user_id", admin.id);
      await service.from("roles").delete().in("id", roleIds);
    }
  });
});

describe("audit — a game is recorded once it is over, not while it is played", () => {
  it("keeps the ending and the final score, and drops the rest", async () => {
    const service = serviceClient();
    const { data: boardgame } = await service
      .from("boardgames")
      .insert({ name: `Audit-jeu-${Date.now()}` })
      .select("*")
      .single();
    const boardgameId = boardgame?.id as string;
    const { data: player, error: playerError } = await service
      .from("players")
      .insert({ name: shortName("Jou") })
      .select("*")
      .single();

    expect(playerError).toBeNull();

    const playerId = player?.id as string;

    const db = authedClient(admin.accessToken);
    const { data: game } = await db
      .from("games")
      .insert({ boardgame_id: boardgameId, status: "ongoing" })
      .select("*")
      .single();
    const gameId = game?.id as string;

    try {
      const seated = await db
        .from("game_players")
        .insert({ game_id: gameId, player_id: playerId, seat_order: 1 });
      // Played: a couple of turns' worth of churn on the game itself.
      const played = await db
        .from("games")
        .update({ round: 2 })
        .eq("id", gameId);

      expect(seated.error).toBeNull();
      expect(played.error).toBeNull();

      expect(await linesAbout("games", gameId)).toEqual([]);
      expect(await linesAbout("game_players", `${gameId}/${playerId}`)).toEqual(
        [],
      );

      // Ended, then the final score written — the order the app writes in.
      const ended = await db
        .from("games")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", gameId);
      const scored = await db
        .from("game_players")
        .update({ score: 42, is_winner: true })
        .eq("game_id", gameId)
        .eq("player_id", playerId);

      expect(ended.error).toBeNull();
      expect(scored.error).toBeNull();

      const gameLines = await linesAbout("games", gameId);
      const playerLines = await linesAbout(
        "game_players",
        `${gameId}/${playerId}`,
      );

      expect(gameLines).toHaveLength(1);
      expect(gameLines[0].changed_keys).toEqual(["ended_at", "status"]);

      expect(playerLines).toHaveLength(1);
      expect(playerLines[0].changed_keys).toEqual(["is_winner", "score"]);
    } finally {
      await service.from("games").delete().eq("id", gameId);
      await service.from("players").delete().eq("id", playerId);
      await service.from("boardgames").delete().eq("id", boardgameId);
    }
  });
});

describe("audit — the history answers to audit.read and to nothing else", () => {
  it("is invisible to an anonymous visitor and to an account without the key", async () => {
    const nobody = await createTestUser({ admin: false });

    try {
      const anonRead = await anonClient().from("audit_log").select("*");
      const bareRead = await authedClient(nobody.accessToken)
        .from("audit_log")
        .select("*");

      // Two different locks, deliberately. `anon` was never granted `select` on
      // this table at all, so it is turned away at the door (42501) instead of
      // being handed an empty list — the history is the one table a visitor has
      // no business even querying. A real session does hold the grant, so for it
      // the policy takes over and filters, silently, as everywhere else.
      expect(anonRead.error?.code).toBe("42501");

      expect(bareRead.error).toBeNull();
      expect(bareRead.data).toEqual([]);
    } finally {
      await deleteTestUser(nobody.id);
    }
  });

  it("is readable through the adapter by an account that holds the key", async () => {
    const repo = createAuditRepository(authedClient(admin.accessToken));
    const entries = await repo.list({ limit: 5 });

    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].occurredAt).toEqual(expect.any(String));
    expect(["insert", "update", "delete"]).toContain(entries[0].action);
  });

  it("reads a first page of its own accord when asked for nothing in particular", async () => {
    const repo = createAuditRepository(authedClient(admin.accessToken));
    const entries = await repo.list();

    // A page and no more, newest first. The count itself is not pinned: how
    // many lines the rest of the suite happens to leave behind is none of this
    // test's business.
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.length).toBeLessThanOrEqual(100);
    expect(entries[0].id).toBeGreaterThan(entries[1].id);
  });

  it("pages backwards without repeating a line", async () => {
    const repo = createAuditRepository(authedClient(admin.accessToken));
    const [first] = await repo.list({ limit: 1 });
    const next = await repo.list({ limit: 1, before: first.id });

    expect(next[0].id).toBeLessThan(first.id);
  });
});

describe("audit — append-only, for everybody", () => {
  it("refuses an insert, an update and a delete even from an administrator", async () => {
    const db = authedClient(admin.accessToken);
    const [oldest] = await createAuditRepository(db).list({ limit: 1 });

    const written = await db.from("audit_log").insert({
      table_name: "players",
      record_id: "forgé",
      action: "insert",
      channel: "app",
      tx_id: 1,
    });
    const rewritten = await db
      .from("audit_log")
      .update({ record_label: "réécrit" })
      .eq("id", oldest.id)
      .select("*");
    const erased = await db
      .from("audit_log")
      .delete()
      .eq("id", oldest.id)
      .select("*");

    // 42501 = insufficient_privilege: there is no insert policy at all, and the
    // grant itself was taken back.
    expect(written.error?.code).toBe("42501");
    // An update and a delete with no policy match no row rather than failing —
    // the same silence RLS keeps everywhere else. What matters is that the line
    // is still there afterwards.
    expect(rewritten.data ?? []).toEqual([]);
    expect(erased.data ?? []).toEqual([]);

    const survivor = await createAuditRepository(db).list({ limit: 1 });

    expect(survivor[0].id).toBe(oldest.id);
    expect(survivor[0].recordLabel).toBe(oldest.recordLabel);
  });
});
