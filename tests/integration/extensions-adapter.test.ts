import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { BoardgameId } from "@/lib/domain";
import { createExtensionRepository } from "@/lib/supabase/repositories/extensions";
import {
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

const CATAN_ID = "78047bc0-5293-4787-be48-ba7339d48c2d" as BoardgameId;

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser();
});

afterAll(async () => {
  if (user) {
    await deleteTestUser(user.id);
  }
});

function repo() {
  return createExtensionRepository(authedClient(user.accessToken));
}

describe("extensions adapter", () => {
  it("lists Catan Marins with its scenarios, ordered", async () => {
    const list = await repo().listByBase(CATAN_ID);
    const marins = list.find(e => e.name === "Catan - Marins");

    expect(marins).toBeDefined();
    expect(marins?.hasScenarios).toBe(true);
    expect(marins?.changesBoard).toBe(true);
    expect(marins?.targetModifier).toBe(0);
    expect(marins?.configFields).toEqual([]);
    expect(marins?.scoringDelta).toBeNull();
    expect(marins?.scenarios.map(s => s.name)).toEqual([
      "À la découverte de nouveaux rivages",
      "Les quatre îles",
      "Le Nouveau Monde",
    ]);

    const four = marins?.scenarios.find(s => s.boardKey === "four-islands");

    expect(four?.targetScore).toBe(13);

    const newWorld = marins?.scenarios.find(s => s.boardKey === "new-world");

    expect(newWorld?.targetScore).toBe(12);
  });

  it("returns no extensions for a base game that has none", async () => {
    const list = await repo().listByBase(
      "00000000-0000-4000-8000-000000000000" as BoardgameId,
    );

    expect(list).toEqual([]);
  });

  it("lists each extended base game once, ignoring inactive extensions", async () => {
    const admin = serviceClient();
    const { data: other } = await admin
      .from("boardgames")
      .select("id")
      .neq("id", CATAN_ID)
      .limit(1)
      .single();
    const otherId = other?.id as BoardgameId;
    // A second active Catan extension (must not duplicate Catan in the result)
    // and a deactivated one on another game (must not appear at all).
    const { data: added } = await admin
      .from("extensions")
      .insert([
        { base_game_id: CATAN_ID, name: "Test — seconde", sort_order: 90 },
        {
          base_game_id: otherId,
          name: "Test — désactivée",
          is_active: false,
          sort_order: 91,
        },
      ])
      .select("id");

    try {
      const ids = await repo().listExtendedBaseGames();

      expect(ids.filter(id => id === CATAN_ID)).toEqual([CATAN_ID]);
      expect(ids).not.toContain(otherId);
    } finally {
      await admin
        .from("extensions")
        .delete()
        .in(
          "id",
          (added ?? []).map(r => r.id),
        );
    }
  });
});
