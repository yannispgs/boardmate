import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { BoardgameId } from "@/lib/domain";
import { createExtensionRepository } from "@/lib/supabase/repositories/extensions";
import {
  authedClient,
  createTestUser,
  deleteTestUser,
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
});
