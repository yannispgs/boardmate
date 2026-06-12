import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { BoardgameId } from "@/lib/domain";
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
  if (user) await deleteTestUser(user.id);
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
    expect(all.some((b) => b.id === created.id)).toBe(true);
    const names = all.map((b) => b.name);
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
