import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";
import {
  DuplicateNameError,
  PlayerInUseError,
} from "@/lib/repositories/errors";
import { createPlayerRepository } from "@/lib/supabase/repositories/players";
import {
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

// Exercises the real Supabase adapter (the anti-lock-in seam) against a live
// local database: it must map DB rows (snake_case) to the domain `Player`
// (camelCase), and translate DB failures into typed domain errors.

// Player names are globally unique (case-insensitive) — suffix them per run so
// they never collide with seeded data or rows left by a prior failed run.
const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const uniq = (base: string) => `${base} ${RUN}`;

let user: TestUser;
const createdIds: string[] = [];

beforeAll(async () => {
  user = await createTestUser();
});

afterAll(async () => {
  // service role bypasses RLS, so it can hard-delete the test rows.
  const admin = serviceClient();
  if (createdIds.length > 0) {
    await admin.from("players").delete().in("id", createdIds);
  }
  if (user) await deleteTestUser(user.id);
});

function repo() {
  return createPlayerRepository(authedClient(user.accessToken));
}

describe("players adapter — row ↔ domain mapping", () => {
  it("maps a created row to the domain shape (camelCase)", async () => {
    const player = await repo().create({ name: uniq("Mapping Mia") });
    createdIds.push(player.id);

    expect(player.name).toBe(uniq("Mapping Mia"));
    expect(player.isActive).toBe(true); // is_active -> isActive
    expect(player.hasPlayed).toBe(false); // no participations yet
    expect(typeof player.createdAt).toBe("string"); // created_at -> createdAt
    expect(typeof player.id).toBe("string");
    // No raw DB keys leak through the adapter.
    expect(player).not.toHaveProperty("is_active");
    expect(player).not.toHaveProperty("created_at");
  });

  it("reads back the same player via get and list", async () => {
    const created = await repo().create({ name: uniq("Readback Rob") });
    createdIds.push(created.id);

    const fetched = await repo().get(created.id);
    expect(fetched).toEqual(created);

    const all = await repo().list();
    expect(all.some((p) => p.id === created.id)).toBe(true);
    // list() is ordered by name ascending.
    const names = all.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("returns null from get for an unknown id", async () => {
    const missing = await repo().get(
      "00000000-0000-0000-0000-000000000000" as PlayerId,
    );
    expect(missing).toBeNull();
  });

  it("updates the name and maps the result", async () => {
    const created = await repo().create({ name: uniq("Rename Before") });
    createdIds.push(created.id);

    const updated = await repo().update(created.id, {
      name: uniq("Rename After"),
    });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe(uniq("Rename After"));
  });

  it("deactivates a player (is_active -> false) without deleting it", async () => {
    const created = await repo().create({ name: uniq("Deactivate Dan") });
    createdIds.push(created.id);

    const deactivated = await repo().setActive(created.id, false);
    expect(deactivated.isActive).toBe(false);

    const still = await repo().get(created.id);
    expect(still?.isActive).toBe(false);
  });
});

describe("players adapter — deletion & unique name", () => {
  it("throws DuplicateNameError on a clashing name (case-insensitive)", async () => {
    const created = await repo().create({ name: uniq("Clashing Cleo") });
    createdIds.push(created.id);

    await expect(
      repo().create({ name: uniq("clashing cleo").toUpperCase() }),
    ).rejects.toBeInstanceOf(DuplicateNameError);
  });

  it("deletes a player who has no game history", async () => {
    const created = await repo().create({ name: uniq("Throwaway Tom") });
    await repo().remove(created.id);
    expect(await repo().get(created.id)).toBeNull();
  });

  it("throws PlayerInUseError when the player has played", async () => {
    const admin = serviceClient();
    const created = await repo().create({ name: uniq("Veteran Vera") });
    createdIds.push(created.id);

    const bid = (
      await admin
        .from("boardgames")
        .insert({ name: uniq("BG") })
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
      .insert({ game_id: gid, player_id: created.id, seat_order: 0 });

    try {
      await expect(repo().remove(created.id)).rejects.toBeInstanceOf(
        PlayerInUseError,
      );
    } finally {
      await admin.from("games").delete().eq("id", gid); // cascades game_players
      await admin.from("boardgames").delete().eq("id", bid);
    }
  });

  it("flags hasPlayed once the player has a game participation", async () => {
    const admin = serviceClient();
    const created = await repo().create({ name: uniq("Played Pat") });
    createdIds.push(created.id);

    // Fresh player: no history yet.
    expect((await repo().get(created.id))?.hasPlayed).toBe(false);

    const bid = (
      await admin
        .from("boardgames")
        .insert({ name: uniq("BG hasPlayed") })
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
      .insert({ game_id: gid, player_id: created.id, seat_order: 0 });

    try {
      // Now reported as having played, via both get and list.
      expect((await repo().get(created.id))?.hasPlayed).toBe(true);
      const listed = (await repo().list()).find((p) => p.id === created.id);
      expect(listed?.hasPlayed).toBe(true);
    } finally {
      await admin.from("games").delete().eq("id", gid); // cascades game_players
      await admin.from("boardgames").delete().eq("id", bid);
    }
  });
});
