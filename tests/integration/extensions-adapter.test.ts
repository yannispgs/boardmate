import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import type {
  BoardgameId,
  ExtensionId,
  ExtensionScenarioId,
} from "@/lib/domain";
import { ScenarioInUseError } from "@/lib/repositories/errors";
import { createExtensionRepository } from "@/lib/supabase/repositories/extensions";
import {
  anonClient,
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

const CATAN_ID = "78047bc0-5293-4787-be48-ba7339d48c2d" as BoardgameId;

/** The smallest board that still parses: one space, one sea tile. */
const SPEC: ScenarioSpec = {
  name: "Îlot",
  targetScore: 11,
  boards: [
    {
      players: [3],
      zones: [
        {
          name: "Mer",
          cells: [{ q: 0, r: 0 }],
          terrainCounts: { sea: 1 },
          numberTokens: [],
        },
      ],
    },
  ],
};

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
    ]);

    const four = marins?.scenarios.find(s => s.name === "Les quatre îles");

    expect(four?.targetScore).toBe(13);
    expect(four?.isOfficial).toBe(true);
  });

  it("lists every active extension, whatever its game", async () => {
    const all = await repo().listAll();
    const byBase = await repo().listByBase(CATAN_ID);

    expect(all.length).toBeGreaterThanOrEqual(byBase.length);
    expect(all.map(e => e.name)).toContain("Catan - Marins");
    expect(all.every(e => e.isActive)).toBe(true);
  });

  it("finds Catan Marins by its key, scenarios included", async () => {
    const marins = await repo().getByKey("catan-marins");

    expect(marins?.name).toBe("Catan - Marins");
    expect(marins?.key).toBe("catan-marins");
    expect(marins?.scenarios.length).toBeGreaterThan(0);
  });

  it("has nothing to return for a key nothing carries", async () => {
    expect(await repo().getByKey("catan-villes-et-chevaliers")).toBeNull();
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

describe("authored scenarios", () => {
  /** The Marins extension, which the authored scenarios hang off. */
  async function marinsId(): Promise<ExtensionId> {
    const list = await repo().listByBase(CATAN_ID);

    return list.find(e => e.name === "Catan - Marins")?.id as ExtensionId;
  }

  const written: ExtensionScenarioId[] = [];

  async function author(name: string) {
    const scenario = await repo().createScenario({
      extensionId: await marinsId(),
      name,
      targetScore: 11,
      boardSpec: SPEC,
      sortOrder: 99,
    });

    written.push(scenario.id);

    return scenario;
  }

  afterAll(async () => {
    await serviceClient()
      .from("extension_scenarios")
      .delete()
      .in("id", written);
  });

  it("writes a board and reads it back through the extension", async () => {
    const created = await author("Test — création");

    expect(created.boardSpec).toEqual(SPEC);
    expect(created.isOfficial).toBe(false);

    const list = await repo().listByBase(CATAN_ID);
    const marins = list.find(e => e.name === "Catan - Marins");
    const read = marins?.scenarios.find(s => s.id === created.id);

    expect(read?.boardSpec).toEqual(SPEC);
  });

  it("changes the name, the target and the board of a scenario", async () => {
    const created = await author("Test — mise à jour");
    const board: ScenarioSpec = { ...SPEC, name: "Deux îlots" };

    const updated = await repo().updateScenario(created.id, {
      name: "Test — renommé",
      targetScore: 15,
      boardSpec: board,
    });

    expect(updated.name).toBe("Test — renommé");
    expect(updated.targetScore).toBe(15);
    expect(updated.boardSpec).toEqual(board);
  });

  it("deletes a scenario nobody has played", async () => {
    const created = await author("Test — suppression");

    await repo().deleteScenario(created.id);

    const list = await repo().listByBase(CATAN_ID);
    const marins = list.find(e => e.name === "Catan - Marins");

    expect(marins?.scenarios.some(s => s.id === created.id)).toBe(false);
  });

  it("leaves an official scenario standing when a delete reaches it", async () => {
    const list = await repo().listByBase(CATAN_ID);
    const marins = list.find(e => e.name === "Catan - Marins");
    const official = marins?.scenarios.find(s => s.isOfficial);

    // No error: the delete policy filters the rows it may reach, so the
    // statement matches nothing at all — as on the players table.
    await repo().deleteScenario(official?.id as ExtensionScenarioId);

    const after = await repo().listByBase(CATAN_ID);
    const stillThere = after
      .find(e => e.name === "Catan - Marins")
      ?.scenarios.some(s => s.id === official?.id);

    expect(stillThere).toBe(true);
  });

  it("refuses to author a scenario as an official one", async () => {
    const { error } = await authedClient(user.accessToken)
      .from("extension_scenarios")
      .insert({
        extension_id: await marinsId(),
        name: "Test — faux officiel",
        is_official: true,
        sort_order: 99,
      });

    expect(error).not.toBeNull();
  });

  it("refuses to delete a scenario a game was played with", async () => {
    const created = await author("Test — jouée");
    const admin = serviceClient();
    const { data: game } = await admin
      .from("games")
      .insert({ boardgame_id: CATAN_ID })
      .select("id")
      .single();

    await admin.from("game_extensions").insert({
      game_id: game?.id as string,
      extension_id: await marinsId(),
      scenario_id: created.id,
    });

    await expect(repo().deleteScenario(created.id)).rejects.toBeInstanceOf(
      ScenarioInUseError,
    );

    await admin
      .from("games")
      .delete()
      .eq("id", game?.id as string);
  });

  it("reads a board the format no longer accepts as no board at all", async () => {
    const created = await author("Test — illisible");

    await serviceClient()
      .from("extension_scenarios")
      .update({ board_spec: { name: "Cassé", boards: "beaucoup" } })
      .eq("id", created.id);

    const list = await repo().listByBase(CATAN_ID);
    const marins = list.find(e => e.name === "Catan - Marins");

    expect(
      marins?.scenarios.find(s => s.id === created.id)?.boardSpec,
    ).toBeNull();
  });

  it("surfaces a write the database turns down", async () => {
    const orphan = repo().createScenario({
      extensionId: "00000000-0000-4000-8000-000000000000" as ExtensionId,
      name: "Sans extension",
      targetScore: null,
      boardSpec: SPEC,
      sortOrder: 0,
    });

    await expect(orphan).rejects.toThrow(/Création du scénario/);

    const missing = repo().updateScenario(
      "00000000-0000-4000-8000-000000000000" as ExtensionScenarioId,
      { name: "Fantôme", targetScore: null, boardSpec: SPEC },
    );

    await expect(missing).rejects.toThrow(/Mise à jour du scénario/);

    const nonsense = repo().deleteScenario(
      "pas-un-uuid" as ExtensionScenarioId,
    );

    await expect(nonsense).rejects.toThrow(/Suppression du scénario/);
  });

  it("denies an anonymous visitor every write", async () => {
    const created = await author("Test — anonyme");
    const anon = () => anonClient().from("extension_scenarios");

    const insert = await anon().insert({
      extension_id: await marinsId(),
      name: "Anon",
      sort_order: 0,
    });

    expect(insert.error).not.toBeNull();

    // An update or a delete no policy allows isn't an error: RLS simply hides
    // every row from it, so it touches nothing and the scenario survives.
    await anon().update({ name: "Anon" }).eq("id", created.id);
    await anon().delete().eq("id", created.id);

    const { data } = await serviceClient()
      .from("extension_scenarios")
      .select("name")
      .eq("id", created.id)
      .single();

    expect(data?.name).toBe("Test — anonyme");
  });
});
