import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { BoardgameId, ConfigId } from "@/lib/domain";
import { createConfigRepository } from "@/lib/supabase/repositories/configs";
import {
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

// Seeded by migration 20260612054230_seed_catan_config_template.sql.
const CATAN_ID = "78047bc0-5293-4787-be48-ba7339d48c2d" as BoardgameId;

let user: TestUser;
const createdIds: string[] = [];

beforeAll(async () => {
  user = await createTestUser();
});

afterAll(async () => {
  const admin = serviceClient();
  if (createdIds.length > 0) {
    await admin.from("configs").delete().in("id", createdIds);
  }
  if (user) {
    await deleteTestUser(user.id);
  }
});

function repo() {
  return createConfigRepository(authedClient(user.accessToken));
}

describe("configs adapter — templates", () => {
  it("reads the seeded Catan template with its FieldSpec[]", async () => {
    const template = await repo().getTemplate(CATAN_ID);
    expect(template).not.toBeNull();
    expect(template?.boardgameId).toBe(CATAN_ID);
    const keys = template?.fields.map(f => f.key);
    expect(keys).toContain("pointsToWin");
    expect(keys).toContain("longestRoad");
    const points = template?.fields.find(f => f.key === "pointsToWin");
    expect(points?.type).toBe("integer");
  });

  it("returns null template for a boardgame without one", async () => {
    const none = await repo().getTemplate(
      "00000000-0000-0000-0000-000000000000" as BoardgameId,
    );
    expect(none).toBeNull();
  });

  it("listTemplates includes Catan", async () => {
    const all = await repo().listTemplates();
    expect(all.some(t => t.boardgameId === CATAN_ID)).toBe(true);
  });
});

describe("configs adapter — instances CRUD & jsonb round-trip", () => {
  it("creates a config and round-trips its values", async () => {
    const values = { pointsToWin: 12, longestRoad: true, largestArmy: false };
    const config = await repo().create({
      boardgameId: CATAN_ID,
      name: "Partie longue",
      values,
    });
    createdIds.push(config.id);

    expect(config.boardgameId).toBe(CATAN_ID);
    expect(config.name).toBe("Partie longue");
    expect(config.values).toEqual(values); // jsonb preserved
    expect(typeof config.createdAt).toBe("string");
    expect(config).not.toHaveProperty("boardgame_id");
  });

  it("lists configs filtered by boardgame", async () => {
    const created = await repo().create({
      boardgameId: CATAN_ID,
      name: "Partie rapide",
      values: { pointsToWin: 8 },
    });
    createdIds.push(created.id);

    const list = await repo().list(CATAN_ID);
    expect(list.every(c => c.boardgameId === CATAN_ID)).toBe(true);
    expect(list.some(c => c.id === created.id)).toBe(true);

    // Unfiltered list (no boardgame id) also returns it.
    const all = await repo().list();
    expect(all.some(c => c.id === created.id)).toBe(true);
  });

  it("reads a single config back with get", async () => {
    const created = await repo().create({
      boardgameId: CATAN_ID,
      name: "À relire",
      values: { pointsToWin: 12 },
    });
    createdIds.push(created.id);

    const fetched = await repo().get(created.id);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.values).toEqual({ pointsToWin: 12 });
  });

  it("updates name and values", async () => {
    const created = await repo().create({
      boardgameId: CATAN_ID,
      name: "Avant",
      values: { pointsToWin: 10 },
    });
    createdIds.push(created.id);

    const updated = await repo().update(created.id, {
      name: "Après",
      values: { pointsToWin: 15, harborMaster: true },
    });
    expect(updated.name).toBe("Après");
    expect(updated.values).toEqual({ pointsToWin: 15, harborMaster: true });

    // Name-only patch leaves the values untouched.
    const renamed = await repo().update(created.id, { name: "Renommé" });
    expect(renamed.name).toBe("Renommé");
    expect(renamed.values).toEqual({ pointsToWin: 15, harborMaster: true });

    // Values-only patch leaves the name untouched.
    const revalued = await repo().update(created.id, {
      values: { pointsToWin: 7 },
    });
    expect(revalued.name).toBe("Renommé");
    expect(revalued.values).toEqual({ pointsToWin: 7 });
  });

  it("removes a config", async () => {
    const created = await repo().create({
      boardgameId: CATAN_ID,
      name: "Jetable",
      values: {},
    });
    await repo().remove(created.id);
    expect(await repo().get(created.id)).toBeNull();
  });

  it("returns null from get for an unknown id", async () => {
    const missing = await repo().get(
      "00000000-0000-0000-0000-000000000000" as ConfigId,
    );
    expect(missing).toBeNull();
  });
});

describe("configs adapter — template defaults", () => {
  it("rewrites the seeded field defaults and round-trips them", async () => {
    const admin = serviceClient();
    // Snapshot the raw fields so the shared template is restored afterwards.
    const { data: before } = await admin
      .from("config_templates")
      .select("fields")
      .eq("boardgame_id", CATAN_ID)
      .single();

    try {
      const updated = await repo().updateTemplateDefaults(CATAN_ID, {
        pointsToWin: 12,
        longestRoad: true,
        // A key absent from the template is ignored (no field to attach to).
        unknownKey: 99,
      });

      const points = updated.fields.find(f => f.key === "pointsToWin");
      const road = updated.fields.find(f => f.key === "longestRoad");

      expect(points?.type === "integer" && points.default).toBe(12);
      expect(road?.type === "boolean" && road.default).toBe(true);
      expect(updated.fields.some(f => f.key === "unknownKey")).toBe(false);

      // Persisted: a fresh read sees the new defaults.
      const reread = await repo().getTemplate(CATAN_ID);
      const rereadPoints = reread?.fields.find(f => f.key === "pointsToWin");
      expect(rereadPoints?.type === "integer" && rereadPoints.default).toBe(12);
    } finally {
      await admin
        .from("config_templates")
        .update({ fields: before?.fields })
        .eq("boardgame_id", CATAN_ID);
    }
  });

  it("throws when the boardgame has no template", async () => {
    await expect(
      repo().updateTemplateDefaults(
        "00000000-0000-0000-0000-000000000000" as BoardgameId,
        { pointsToWin: 10 },
      ),
    ).rejects.toThrow(/pas de modèle/);
  });
});

describe("configs adapter — error mapping", () => {
  const BAD_UUID = "not-a-uuid";

  it("rethrows a generic error when create hits a check violation", async () => {
    // Whitespace-only name violates the length check (23514) → generic rethrow.
    await expect(
      repo().create({ boardgameId: CATAN_ID, name: "   ", values: {} }),
    ).rejects.toThrow();
  });

  it("rethrows a generic error on an invalid id (get/update/remove)", async () => {
    await expect(repo().get(BAD_UUID as ConfigId)).rejects.toThrow();

    await expect(
      repo().update(BAD_UUID as ConfigId, { name: "X" }),
    ).rejects.toThrow();

    await expect(repo().remove(BAD_UUID as ConfigId)).rejects.toThrow();
  });

  it("rethrows a generic error from getTemplate/list on an invalid id", async () => {
    await expect(repo().getTemplate(BAD_UUID as BoardgameId)).rejects.toThrow();

    await expect(repo().list(BAD_UUID as BoardgameId)).rejects.toThrow();
  });
});
