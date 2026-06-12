import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";
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
// (camelCase) and back through every method.

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
    const player = await repo().create({ name: "Mapping Mia" });
    createdIds.push(player.id);

    expect(player.name).toBe("Mapping Mia");
    expect(player.isActive).toBe(true); // is_active -> isActive
    expect(typeof player.createdAt).toBe("string"); // created_at -> createdAt
    expect(typeof player.id).toBe("string");
    // No raw DB keys leak through the adapter.
    expect(player).not.toHaveProperty("is_active");
    expect(player).not.toHaveProperty("created_at");
  });

  it("reads back the same player via get and list", async () => {
    const created = await repo().create({ name: "Readback Rob" });
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
    const created = await repo().create({ name: "Rename Before" });
    createdIds.push(created.id);

    const updated = await repo().update(created.id, { name: "Rename After" });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe("Rename After");
  });

  it("deactivates a player (is_active -> false) without deleting it", async () => {
    const created = await repo().create({ name: "Deactivate Dan" });
    createdIds.push(created.id);

    const deactivated = await repo().setActive(created.id, false);
    expect(deactivated.isActive).toBe(false);

    // Still present (deactivated, not deleted).
    const still = await repo().get(created.id);
    expect(still?.isActive).toBe(false);
  });
});
