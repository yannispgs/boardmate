import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { BoardgameId, ConfigId, GameId, PlayerId } from "@/lib/domain";
import { createGameRepository } from "@/lib/supabase/repositories/games";
import {
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

const CATAN_ID = "78047bc0-5293-4787-be48-ba7339d48c2d" as BoardgameId;

let user: TestUser;
const playerIds: PlayerId[] = [];
const gameIds: GameId[] = [];
let configId: ConfigId;

beforeAll(async () => {
  user = await createTestUser();
  const admin = serviceClient();
  // Three players seated p0, p1, p2 (service role bypasses RLS for setup).
  // Names stay ≤ 20 chars (DB constraint): a base36 timestamp keeps them short.
  for (const name of ["P-un", "P-deux", "P-trois"]) {
    const { data } = await admin
      .from("players")
      .insert({ name: `${name}-${Date.now().toString(36)}` })
      .select("id")
      .single();
    playerIds.push(data?.id as PlayerId);
  }
  const { data: cfg } = await admin
    .from("configs")
    .insert({
      boardgame_id: CATAN_ID,
      name: `cfg-${Date.now()}`,
      values: { pointsToWin: 10 },
    })
    .select("id")
    .single();
  configId = cfg?.id as ConfigId;
});

afterAll(async () => {
  const admin = serviceClient();
  for (const id of gameIds) {
    await admin.from("games").delete().eq("id", id);
  }
  await admin.from("configs").delete().eq("id", configId);
  await admin.from("players").delete().in("id", playerIds);
  if (user) {
    await deleteTestUser(user.id);
  }
});

function repo() {
  return createGameRepository(authedClient(user.accessToken));
}

describe("games adapter — creation & population", () => {
  it("creates a game with seated players and the first player active", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId,
      playerIds,
    });
    gameIds.push(game.id);

    expect(game.status).toBe("ongoing");
    expect(game.round).toBe(1);
    expect(game.turn).toBe(1);
    expect(game.currentPlayerId).toBe(playerIds[0]);
    expect(game.endedAt).toBeNull();
  });

  it("resolves related entities and seat order in getPopulated", async () => {
    const created = await repo().create({
      boardgameId: CATAN_ID,
      configId,
      playerIds,
    });
    gameIds.push(created.id);

    const populated = await repo().getPopulated(created.id);
    expect(populated?.boardgame.name).toBe("Catan");
    expect(populated?.config?.id).toBe(configId);
    expect(populated?.players.map(p => p.playerId)).toEqual(playerIds);
    expect(populated?.players.map(p => p.seatOrder)).toEqual([0, 1, 2]);
    expect(populated?.currentPlayer?.id).toBe(playerIds[0]);
    expect(populated?.turns).toEqual([]);
  });

  it("returns null from getPopulated for an unknown id", async () => {
    const missing = crypto.randomUUID() as GameId;

    expect(await repo().getPopulated(missing)).toBeNull();
  });

  it("throws on a real FK violation when a seated player is unknown", async () => {
    const admin = serviceClient();
    const before = new Set(
      ((await admin.from("games").select("id")).data ?? []).map(g => g.id),
    );

    // First player valid → the games insert succeeds; the second is unknown →
    // the game_players insert hits a genuine FK violation (no mock).
    const bad = crypto.randomUUID() as PlayerId;
    await expect(
      repo().create({
        boardgameId: CATAN_ID,
        configId: null,
        playerIds: [playerIds[0], bad],
      }),
    ).rejects.toThrow(/Ajout des joueurs/);

    // The games row was inserted before game_players failed — track the orphan
    // so afterAll cleans it up.
    const after = (await admin.from("games").select("id")).data ?? [];
    for (const g of after) {
      if (!before.has(g.id)) {
        gameIds.push(g.id as GameId);
      }
    }
  });
});

describe("games adapter — turn rotation & time logging", () => {
  it("records each turn and rotates players, incrementing the round on wrap", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    await repo().advanceTurn(game.id, 30); // p0 played turn 1 for 30s
    let p = await repo().getPopulated(game.id);
    expect(p?.turn).toBe(2);
    expect(p?.round).toBe(1);
    expect(p?.currentPlayer?.id).toBe(playerIds[1]);
    expect(p?.turns).toHaveLength(1);
    expect(p?.turns[0].playerId).toBe(playerIds[0]);
    expect(p?.turns[0].durationS).toBe(30);

    await repo().advanceTurn(game.id, 12); // p1 -> p2
    await repo().advanceTurn(game.id, 5); // p2 -> wraps to p0, round 2
    p = await repo().getPopulated(game.id);
    expect(p?.turn).toBe(4);
    expect(p?.round).toBe(2);
    expect(p?.currentPlayer?.id).toBe(playerIds[0]);
    expect(p?.turns).toHaveLength(3);
    // Per-player active time aggregates by summing durations.
    const total = p?.turns.reduce((s, t) => s + t.durationS, 0);
    expect(total).toBe(47);
  });
});

describe("games adapter — listing & ending", () => {
  it("lists ongoing by default, then moves to ended with a winner", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    const ongoing = await repo().list();
    expect(ongoing.some(g => g.id === game.id)).toBe(true);

    // The list carries participants in play order (seat_order).
    const listed = ongoing.find(g => g.id === game.id);
    expect(listed?.players.map(p => p.id)).toEqual(playerIds);

    await repo().end(game.id, playerIds[1]);

    const stillOngoing = await repo().list();
    expect(stillOngoing.some(g => g.id === game.id)).toBe(false);
    const ended = await repo().list({ status: "ended" });
    expect(ended.some(g => g.id === game.id)).toBe(true);
    // The list item flags the winner, so the card can show it.
    const endedItem = ended.find(g => g.id === game.id);
    expect(endedItem?.players.filter(p => p.isWinner).map(p => p.id)).toEqual([
      playerIds[1],
    ]);

    const populated = await repo().getPopulated(game.id);
    expect(populated?.status).toBe("ended");
    expect(populated?.endedAt).not.toBeNull();
    const winner = populated?.players.find(p => p.isWinner);
    expect(winner?.playerId).toBe(playerIds[1]);
  });
});

describe("games adapter — error mapping", () => {
  const BAD_UUID = "not-a-uuid";

  it("rethrows a generic error on an invalid id (getPopulated/advanceTurn/end)", async () => {
    // An invalid UUID is a 22P02 DB error → the generic rethrow in each method.
    await expect(repo().getPopulated(BAD_UUID as GameId)).rejects.toThrow();

    await expect(repo().advanceTurn(BAD_UUID as GameId, 10)).rejects.toThrow();

    await expect(
      repo().end(BAD_UUID as GameId, playerIds[0]),
    ).rejects.toThrow();
  });

  it("rethrows a generic error when create references a bad boardgame id", async () => {
    await expect(
      repo().create({
        boardgameId: BAD_UUID as BoardgameId,
        configId: null,
        playerIds: [],
      }),
    ).rejects.toThrow();
  });
});
