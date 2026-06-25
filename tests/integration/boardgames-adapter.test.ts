import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { BoardgameId } from "@/lib/domain";
import { BoardgameInUseError } from "@/lib/repositories/errors";
import { createBoardgameRepository } from "@/lib/supabase/repositories/boardgames";
import {
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

let user: TestUser;
const createdIds: string[] = [];

// Boardgame names are globally unique; suffix them per run so they never
// collide with seeded data (e.g. Catan) or rows left by a prior failed run.
const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const uniq = (base: string) => `${base} ${RUN}`;

beforeAll(async () => {
  user = await createTestUser();
});

afterAll(async () => {
  const admin = serviceClient();
  if (createdIds.length > 0) {
    await admin.from("boardgames").delete().in("id", createdIds);
  }
  if (user) {
    await deleteTestUser(user.id);
  }
});

function repo() {
  return createBoardgameRepository(authedClient(user.accessToken));
}

describe("boardgames adapter — row ↔ domain mapping & CRUD", () => {
  it("maps a created row to the domain shape with defaults", async () => {
    const bg = await repo().create({
      name: uniq("Catan"),
      minPlayers: 3,
      maxPlayers: 4,
    });
    createdIds.push(bg.id);

    expect(bg.name).toBe(uniq("Catan"));
    expect(bg.minPlayers).toBe(3);
    expect(bg.maxPlayers).toBe(4);
    expect(bg.kind).toBe("competitive"); // DB default
    expect(bg.tags).toEqual([]); // DB default
    expect(bg.isActive).toBe(true); // DB default
    expect(bg.hasGames).toBe(false); // no games yet
    expect(bg.logoUrl).toBeNull();
    expect(typeof bg.createdAt).toBe("string");
    expect(bg).not.toHaveProperty("min_players");
    expect(bg).not.toHaveProperty("created_at");
  });

  it("persists the full field set and reads it back", async () => {
    const created = await repo().create({
      name: uniq("Scythe"),
      minPlayers: 1,
      maxPlayers: 5,
      recMinPlayers: 3,
      recMaxPlayers: 4,
      avgDurationMin: 115,
      tags: ["stratégie", "4x"],
    });
    createdIds.push(created.id);

    const fetched = await repo().get(created.id);
    expect(fetched).toEqual(created);
    expect(fetched?.recMinPlayers).toBe(3);
    expect(fetched?.avgDurationMin).toBe(115);
    expect(fetched?.tags).toEqual(["stratégie", "4x"]);

    const all = await repo().list();
    expect(all.some(b => b.id === created.id)).toBe(true);
    const names = all.map(b => b.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("updates a subset of fields", async () => {
    const created = await repo().create({ name: uniq("Wingspan") });
    createdIds.push(created.id);

    const updated = await repo().update(created.id, {
      avgDurationMin: 60,
      tags: ["oiseaux"],
    });
    expect(updated.name).toBe(uniq("Wingspan")); // untouched
    expect(updated.avgDurationMin).toBe(60);
    expect(updated.tags).toEqual(["oiseaux"]);
  });

  it("removes a boardgame that has no games", async () => {
    const created = await repo().create({ name: uniq("Throwaway") });
    const removed = await repo().get(created.id);
    expect(removed).not.toBeNull();

    await repo().remove(created.id);
    expect(await repo().get(created.id)).toBeNull();
  });

  it("deactivates a boardgame (is_active -> false) without deleting it", async () => {
    const created = await repo().create({ name: "Deactivate BG" });
    createdIds.push(created.id);

    const deactivated = await repo().setActive(created.id, false);
    expect(deactivated.isActive).toBe(false);

    const still = await repo().get(created.id);
    expect(still?.isActive).toBe(false);
  });

  it("flags hasGames and blocks deletion once a game exists", async () => {
    const admin = serviceClient();
    const created = await repo().create({ name: "Played BG" });
    createdIds.push(created.id);

    // Fresh boardgame: no games yet.
    expect((await repo().get(created.id))?.hasGames).toBe(false);

    const gid = (
      await admin
        .from("games")
        .insert({ boardgame_id: created.id })
        .select("id")
        .single()
    ).data?.id as string;

    try {
      // The trigger flips has_games; the FK restricts deletion.
      expect((await repo().get(created.id))?.hasGames).toBe(true);
      const listed = (await repo().list()).find(b => b.id === created.id);
      expect(listed?.hasGames).toBe(true);
      await expect(repo().remove(created.id)).rejects.toBeInstanceOf(
        BoardgameInUseError,
      );
    } finally {
      await admin.from("games").delete().eq("id", gid);
    }
  });

  it("returns null from get for an unknown id", async () => {
    const missing = await repo().get(
      "00000000-0000-0000-0000-000000000000" as BoardgameId,
    );
    expect(missing).toBeNull();
  });

  it("uploads a logo and returns a public URL that serves the bytes", async () => {
    const file = new File(["PNGDATA"], "logo.png", { type: "image/png" });
    const url = await repo().uploadLogo(file);
    expect(url).toMatch(/\/storage\/v1\/object\/public\/logos\//);

    // Public bucket: the URL is reachable without auth.
    const res = await fetch(url);
    expect(res.ok).toBe(true);
    expect(await res.text()).toBe("PNGDATA");

    // Cleanup the uploaded object.
    const path = url.split("/logos/")[1];
    await serviceClient().storage.from("logos").remove([path]);
  });
});

describe("boardgames adapter — error mapping", () => {
  const BAD_UUID = "not-a-uuid" as BoardgameId;

  it("rethrows a generic error when create hits a check violation", async () => {
    // Whitespace-only name violates the length check (23514) → generic rethrow.
    await expect(repo().create({ name: "   " })).rejects.toThrow();
  });

  it("rethrows a generic error on an invalid id (get/update/setActive/remove)", async () => {
    await expect(repo().get(BAD_UUID)).rejects.toThrow();

    await expect(repo().update(BAD_UUID, { name: "X" })).rejects.toThrow();

    await expect(repo().setActive(BAD_UUID, false)).rejects.toThrow();

    await expect(repo().remove(BAD_UUID)).rejects.toThrow();
  });
});
