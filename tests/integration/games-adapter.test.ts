import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type {
  BoardgameId,
  ConfigId,
  ExtensionId,
  ExtensionScenarioId,
  GameId,
  PlayerId,
} from "@/lib/domain";
import { AlreadyClaimedError } from "@/lib/repositories/errors";
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
    // No recap snapshot was passed → the column stays null.
    expect(game.configValues).toBeNull();

    // No initialScore → every player's score stays null (final/unscored games).
    const populated = await repo().getPopulated(game.id);

    expect(populated?.players.map(p => p.score)).toEqual([null, null, null]);
  });

  it("seeds every player's score at initialScore for live-scored games", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId,
      playerIds,
      initialScore: 2,
    });
    gameIds.push(game.id);

    // Catan starts everyone at 2, so no player is ever left unscored.
    const populated = await repo().getPopulated(game.id);

    expect(populated?.players.map(p => p.score)).toEqual([2, 2, 2]);
  });

  it("setBreakdown records per-category detail and re-derives the winner", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId,
      playerIds,
    });
    gameIds.push(game.id);

    // First ended with player 0 as the winner…
    await repo().end(game.id, [playerIds[0]]);
    // …then the category detail is filled, making player 1 the top total.
    await repo().setBreakdown(
      game.id,
      [playerIds[1]],
      [
        { playerId: playerIds[0], score: 8, breakdown: { a: 3, b: 5 } },
        { playerId: playerIds[1], score: 12, breakdown: { a: 7, b: 5 } },
        { playerId: playerIds[2], score: 4, breakdown: { a: 1, b: 3 } },
      ],
    );

    const populated = await repo().getPopulated(game.id);
    const byId = new Map(populated?.players.map(p => [p.playerId, p]));

    // The previous winner is reset; the recomputed one is set.
    expect(byId.get(playerIds[0])?.isWinner).toBe(false);
    expect(byId.get(playerIds[1])?.isWinner).toBe(true);
    expect(byId.get(playerIds[1])?.score).toBe(12);
    expect(byId.get(playerIds[0])?.scoreBreakdown).toEqual({ a: 3, b: 5 });
  });

  it("snapshots recap-tweaked config values and resolves the threshold from them", async () => {
    // The launch recap can tweak the score-to-reach for one game only, with no
    // source config: the snapshot (8) overrides the template default (10).
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      configValues: { pointsToWin: 8 },
      playerIds,
    });
    gameIds.push(game.id);

    expect(game.configValues).toEqual({ pointsToWin: 8 });

    const populated = await repo().getPopulated(game.id);
    expect(populated?.configValues).toEqual({ pointsToWin: 8 });
    expect(populated?.winThreshold).toBe(8);
  });

  it("the snapshot overrides the source config's value for the threshold", async () => {
    // configId's config has pointsToWin 10; the recap raised it to 15 here.
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId,
      configValues: { pointsToWin: 15 },
      playerIds,
    });
    gameIds.push(game.id);

    const populated = await repo().getPopulated(game.id);
    expect(populated?.winThreshold).toBe(15);
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
    // The turn schedule resolves from Catan's config template defaults.
    expect(populated?.turnSchedule).toEqual({
      baseS: 45,
      stepS: 5,
      maxS: 180,
    });
  });

  it("puts the table back in order, seat numbers and current player with it", async () => {
    const created = await repo().create({
      boardgameId: CATAN_ID,
      configId,
      playerIds,
    });
    gameIds.push(created.id);

    // Two neighbours swapped: the naive update would collide on the seat each
    // is moving into, which is why the whole permutation goes down at once.
    const corrected = [playerIds[1], playerIds[0], playerIds[2]];
    await repo().setSeatOrder(created.id, corrected);

    const populated = await repo().getPopulated(created.id);
    expect(populated?.players.map(p => p.playerId)).toEqual(corrected);
    expect(populated?.players.map(p => p.seatOrder)).toEqual([0, 1, 2]);
    expect(populated?.currentPlayer?.id).toBe(playerIds[1]);
  });

  it("refuses a seating that doesn't name the whole table exactly once", async () => {
    const created = await repo().create({
      boardgameId: CATAN_ID,
      configId,
      playerIds,
    });
    gameIds.push(created.id);

    const partial = [playerIds[0], playerIds[1]];
    await expect(repo().setSeatOrder(created.id, partial)).rejects.toThrow(
      /Ordre des joueurs/,
    );

    const twice = [playerIds[0], playerIds[0], playerIds[1]];
    await expect(repo().setSeatOrder(created.id, twice)).rejects.toThrow(
      /Ordre des joueurs/,
    );

    const outsider = [playerIds[0], playerIds[1], crypto.randomUUID()];
    await expect(
      repo().setSeatOrder(created.id, outsider as PlayerId[]),
    ).rejects.toThrow(/Ordre des joueurs/);

    // Every refusal rolled back: the seating is untouched, nobody parked.
    const populated = await repo().getPopulated(created.id);
    expect(populated?.players.map(p => p.playerId)).toEqual(playerIds);
    expect(populated?.players.map(p => p.seatOrder)).toEqual([0, 1, 2]);
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

    // p0: 30s active, 2 pauses/18s, 7s over the allotted time
    await repo().advanceTurn(game.id, 30, 2, 18, 7);
    let p = await repo().getPopulated(game.id);
    expect(p?.turn).toBe(2);
    expect(p?.round).toBe(1);
    expect(p?.currentPlayer?.id).toBe(playerIds[1]);
    expect(p?.turns).toHaveLength(1);
    expect(p?.turns[0].playerId).toBe(playerIds[0]);
    // A lap-based game has no generation to file its turns under.
    expect(p?.turns[0].stage).toBeNull();
    expect(p?.stage).toBe(1);
    expect(p?.stagePasses).toEqual([]);
    expect(p?.turns[0].durationS).toBe(30);
    expect(p?.turns[0].pauseCount).toBe(2);
    expect(p?.turns[0].pauseDurationS).toBe(18);
    expect(p?.turns[0].overtimeS).toBe(7);

    await repo().advanceTurn(game.id, 12, 0, 0, 0); // p1 -> p2
    await repo().advanceTurn(game.id, 5, 0, 0, 0); // p2 -> wraps to p0, round 2
    p = await repo().getPopulated(game.id);
    expect(p?.turn).toBe(4);
    expect(p?.round).toBe(2);
    expect(p?.currentPlayer?.id).toBe(playerIds[0]);
    expect(p?.turns).toHaveLength(3);
    // Per-player active time aggregates by summing durations.
    const total = p?.turns.reduce((s, t) => s + t.durationS, 0);
    expect(total).toBe(47);
  });

  it("records a simultaneous round with no owner and who we waited on", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    // Simultaneous: one shared turn advances the whole round, tagged with the
    // player the table waited on (no per-player owner).
    await repo().advanceTurn(game.id, 40, 0, 0, 0, {
      turnMode: "simultaneous",
      blockedById: playerIds[1],
      waitedSeconds: 12,
    });
    let p = await repo().getPopulated(game.id);
    expect(p?.turn).toBe(2);
    expect(p?.round).toBe(2); // a round is one turn, so it advances every turn
    expect(p?.currentPlayer).toBeNull();
    expect(p?.turns).toHaveLength(1);
    expect(p?.turns[0].playerId).toBeNull();
    expect(p?.turns[0].blockedById).toBe(playerIds[1]);
    expect(p?.turns[0].waitedS).toBe(12);
    expect(p?.turns[0].durationS).toBe(40);

    // A round nobody was flagged on records a null blocker and no wait time.
    await repo().advanceTurn(game.id, 20, 0, 0, 0, {
      turnMode: "simultaneous",
      blockedById: null,
    });
    p = await repo().getPopulated(game.id);
    expect(p?.round).toBe(3);
    expect(p?.turns).toHaveLength(2);
    expect(p?.turns[1].blockedById).toBeNull();
    expect(p?.turns[1].waitedS).toBe(0);

    // Flagged but no wait time provided → defaults to 0.
    await repo().advanceTurn(game.id, 15, 0, 0, 0, {
      turnMode: "simultaneous",
      blockedById: playerIds[2],
    });
    p = await repo().getPopulated(game.id);
    expect(p?.turns[2].blockedById).toBe(playerIds[2]);
    expect(p?.turns[2].waitedS).toBe(0);
  });

  it("logs dice rolls and returns them in draw order", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    await repo().addDiceRoll(game.id, 7);
    await repo().addDiceRoll(game.id, 11);
    await repo().addDiceRoll(game.id, 7);

    const p = await repo().getPopulated(game.id);

    expect(p?.diceRolls.map(d => d.value)).toEqual([7, 11, 7]);
    expect(p?.diceRolls.every(d => typeof d.at === "string")).toBe(true);
  });
});

describe("games adapter — generations (Terraforming Mars)", () => {
  let marsId: BoardgameId;

  beforeAll(async () => {
    const { data } = await serviceClient()
      .from("boardgames")
      .select("id, stages")
      .eq("name", "Terraforming Mars")
      .single();

    marsId = data?.id as BoardgameId;
    // The seeded game must actually declare generations, or every assertion
    // below would silently fall back to lap rotation.
    expect(data?.stages).toEqual({ label: "Génération", advance: "pass" });
  });

  it("rotates only between the players still in, and opens the next generation on the marker", async () => {
    const game = await repo().create({
      boardgameId: marsId,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    const play = (passing = false) => {
      return repo().advanceTurn(game.id, 10, 0, 0, 0, {
        advance: "pass",
        passing,
      });
    };

    // p0 plays on, then p1 passes: the table hands over to p2 and p1 is out
    // for the rest of the generation.
    await play();
    await play(true);
    let p = await repo().getPopulated(game.id);
    expect(p?.currentPlayer?.id).toBe(playerIds[2]);
    expect(p?.stage).toBe(1);
    expect(p?.stagePasses).toEqual([{ playerId: playerIds[1], stage: 1 }]);

    // p2 plays: the rotation skips p1 and comes back to p0.
    await play();
    p = await repo().getPopulated(game.id);
    expect(p?.currentPlayer?.id).toBe(playerIds[0]);

    // p0 passes, then p2 — the last one in, which ends the generation. The
    // next one opens on the moved first-player marker (seat 1) with everybody
    // back in, and the round follows the generation.
    await play(true);
    p = await repo().getPopulated(game.id);
    expect(p?.currentPlayer?.id).toBe(playerIds[2]);

    await play(true);
    p = await repo().getPopulated(game.id);
    expect(p?.stage).toBe(2);
    expect(p?.round).toBe(2);
    expect(p?.currentPlayer?.id).toBe(playerIds[1]);
    expect(p?.stagePasses).toHaveLength(3);

    // Every turn is filed under the generation it was played in, which is what
    // the per-player turn counts are read from.
    expect(p?.turns).toHaveLength(5);
    expect(p?.turns.every(t => t.stage === 1)).toBe(true);

    await play();
    p = await repo().getPopulated(game.id);
    expect(p?.turn).toBe(7);
    expect(p?.turns.filter(t => t.stage === 2)).toHaveLength(1);
    expect(p?.currentPlayer?.id).toBe(playerIds[2]);
  });

  it("hands milestones out one claimer at a time, stamped with the generation", async () => {
    const game = await repo().create({
      boardgameId: marsId,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    await repo().claimMilestone(game.id, playerIds[0], "terraformeur");

    let p = await repo().getPopulated(game.id);

    expect(p?.milestoneClaims).toEqual([
      { playerId: playerIds[0], milestoneKey: "terraformeur", stage: 1 },
    ]);

    // Two phones tapping at the same moment: only the first one may win, and
    // the second is told so rather than quietly overwriting the claimer.
    await expect(
      repo().claimMilestone(game.id, playerIds[1], "terraformeur"),
    ).rejects.toThrow(AlreadyClaimedError);

    // Anything else the database refuses stays a plain failure: only a taken
    // milestone is worth telling the table about specifically.
    const ghost = "00000000-0000-0000-0000-000000000000" as PlayerId;

    await expect(
      repo().claimMilestone(game.id, ghost, "maire"),
    ).rejects.not.toThrow(AlreadyClaimedError);

    // The generation the claim is stamped with is the one it was taken in.
    await repo().advanceTurn(game.id, 10, 0, 0, 0, {
      advance: "pass",
      passing: true,
    });
    await repo().advanceTurn(game.id, 10, 0, 0, 0, {
      advance: "pass",
      passing: true,
    });
    await repo().advanceTurn(game.id, 10, 0, 0, 0, {
      advance: "pass",
      passing: true,
    });
    await repo().claimMilestone(game.id, playerIds[1], "maire");

    p = await repo().getPopulated(game.id);

    expect(p?.stage).toBe(2);
    expect(p?.milestoneClaims.map(c => c.stage)).toEqual([1, 2]);

    // Given to the wrong player, it goes back and can be handed over again.
    await repo().releaseMilestone(game.id, "terraformeur");
    await repo().claimMilestone(game.id, playerIds[2], "terraformeur");

    p = await repo().getPopulated(game.id);

    expect(p?.milestoneClaims).toHaveLength(2);
    expect(
      p?.milestoneClaims.find(c => c.milestoneKey === "terraformeur")?.playerId,
    ).toBe(playerIds[2]);
  });
});

describe("games adapter — calendar of manches (Wingspan)", () => {
  let wingspanId: BoardgameId;

  beforeAll(async () => {
    const { data } = await serviceClient()
      .from("boardgames")
      .select("id, stages")
      .eq("name", "Wingspan")
      .single();

    wingspanId = data?.id as BoardgameId;
    // Without a schedule the rotation would silently fall back to plain laps.
    expect((data?.stages as { advance?: string })?.advance).toBe("schedule");
  });

  it("lays out the calendar, turns through it, and records each manche's goal", async () => {
    // One lap per manche: the point is the hand-over, not the length.
    const game = await repo().create({
      boardgameId: wingspanId,
      configId: null,
      playerIds,
      stages: [
        {
          stage: 1,
          goalKey: "eggsInHabitat",
          goalParams: { habitat: "sea" },
          turns: 1,
        },
        {
          stage: 2,
          goalKey: "birdsInHabitat",
          goalParams: { habitat: "forest" },
          turns: 1,
        },
      ],
    });
    gameIds.push(game.id);

    let p = await repo().getPopulated(game.id);

    expect(p?.stages).toEqual([
      {
        stage: 1,
        goalKey: "eggsInHabitat",
        goalParams: { habitat: "sea" },
        turns: 1,
      },
      {
        stage: 2,
        goalKey: "birdsInHabitat",
        goalParams: { habitat: "forest" },
        turns: 1,
      },
    ]);

    // The manche's goal is scored while the birds are still on the table.
    await repo().setStageScores(game.id, 1, [
      { playerId: playerIds[0], points: 4 },
      { playerId: playerIds[1], points: 2 },
      { playerId: playerIds[2], points: 0 },
    ]);
    // Misheard, then corrected: the same player never holds two rows.
    await repo().setStageScores(game.id, 1, [
      { playerId: playerIds[0], points: 5 },
      { playerId: playerIds[1], points: 2 },
      { playerId: playerIds[2], points: 0 },
    ]);

    const play = () => {
      return repo().advanceTurn(game.id, 10, 0, 0, 0, { advance: "schedule" });
    };

    await play();
    await play();
    await play();
    p = await repo().getPopulated(game.id);

    // The lap is over, so manche 2 opens — on the moved first-player marker.
    expect(p?.stage).toBe(2);
    expect(p?.turn).toBe(4);
    expect(p?.currentPlayer?.id).toBe(playerIds[1]);
    expect(p?.stageScores).toHaveLength(3);
    expect(p?.stageScores.find(s => s.playerId === playerIds[0])?.points).toBe(
      5,
    );

    await repo().setStageScores(game.id, 2, [
      { playerId: playerIds[0], points: 1 },
      { playerId: playerIds[1], points: 3 },
      { playerId: playerIds[2], points: 6 },
    ]);
    await repo().end(game.id, [playerIds[2]]);

    // What the stats read back: each manche with its tile and its points.
    const stats = await repo().listStats();
    const record = stats.find(s => s.gameId === game.id);

    expect(record?.stageGoals?.map(g => g.goalKey)).toEqual([
      "eggsInHabitat",
      "birdsInHabitat",
    ]);
    expect(record?.stageGoals?.[0].goalParams).toEqual({ habitat: "sea" });
    expect(record?.stageGoals?.[1].points).toHaveLength(3);
  });
});

describe("games adapter — removing (abandoning) a game", () => {
  it("deletes the game and its rows, and recomputes has_games", async () => {
    const admin = serviceClient();
    // A throwaway boardgame so the game is its only one.
    const { data: bg } = await admin
      .from("boardgames")
      .insert({ name: `Abandon ${Date.now().toString(36)}` })
      .select("id")
      .single();
    const bgId = bg?.id as BoardgameId;

    try {
      const game = await repo().create({
        boardgameId: bgId,
        configId: null,
        playerIds,
      });
      await repo().advanceTurn(game.id, 10, 0, 0, 0); // leaves a game_turn

      // Creating the game flipped the boardgame to "has games".
      const before = await admin
        .from("boardgames")
        .select("has_games")
        .eq("id", bgId)
        .single();
      expect(before.data?.has_games).toBe(true);

      await repo().remove(game.id);

      expect(await repo().getPopulated(game.id)).toBeNull();
      const { count } = await admin
        .from("game_players")
        .select("*", { count: "exact", head: true })
        .eq("game_id", game.id);
      expect(count).toBe(0);

      // Deleting its only game recomputed has_games back to false.
      const after = await admin
        .from("boardgames")
        .select("has_games")
        .eq("id", bgId)
        .single();
      expect(after.data?.has_games).toBe(false);
    } finally {
      await admin.from("boardgames").delete().eq("id", bgId);
    }
  });

  it("rethrows a generic error on an invalid id", async () => {
    await expect(repo().remove("not-a-uuid" as GameId)).rejects.toThrow();
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

    // Catan is live/threshold; with no config, the target resolves from the
    // config template's `pointsToWin` default (10).
    let populated = await repo().getPopulated(game.id);
    expect(populated?.boardgame.scoring?.timing).toBe("live");
    expect(populated?.boardgame.scoring?.winCondition).toEqual({
      type: "threshold",
      field: "pointsToWin",
    });
    expect(populated?.winThreshold).toBe(10);

    // Live scoring: setScore updates a player's running total and logs history,
    // tagged with the tour it happened in.
    await repo().setScore(game.id, playerIds[1], 10, 3);
    await repo().setScore(game.id, playerIds[0], 7, 4);
    populated = await repo().getPopulated(game.id);
    expect(
      populated?.players.find(p => p.playerId === playerIds[1])?.score,
    ).toBe(10);
    // Each change is recorded for the evolution chart, with its tour.
    expect(populated?.scoreEvents).toHaveLength(2);
    expect(populated?.scoreEvents.map(e => e.score).sort()).toEqual(
      [10, 7].sort(),
    );
    expect(populated?.scoreEvents.map(e => e.round).sort()).toEqual([3, 4]);

    await repo().end(game.id, [playerIds[1]]); // scores already persisted

    const stillOngoing = await repo().list();
    expect(stillOngoing.some(g => g.id === game.id)).toBe(false);
    const ended = await repo().list({ status: "ended" });
    expect(ended.some(g => g.id === game.id)).toBe(true);
    // The list item flags the winner and carries the score.
    const endedItem = ended.find(g => g.id === game.id);
    expect(endedItem?.players.filter(p => p.isWinner).map(p => p.id)).toEqual([
      playerIds[1],
    ]);
    expect(endedItem?.players.find(p => p.id === playerIds[1])?.score).toBe(10);

    populated = await repo().getPopulated(game.id);
    expect(populated?.status).toBe("ended");
    expect(populated?.endedAt).not.toBeNull();
    expect(populated?.players.find(p => p.isWinner)?.playerId).toBe(
      playerIds[1],
    );
  });

  it("listStats returns ended games with boardgame, participants and turns", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    // One recorded turn (30s active, 4s over) + two dice rolls, then end.
    await repo().advanceTurn(game.id, 30, 0, 0, 4);
    await repo().addDiceRoll(game.id, 8);
    await repo().addDiceRoll(game.id, 6);
    await repo().end(
      game.id,
      [playerIds[0]],
      [{ playerId: playerIds[0], score: 12 }],
    );

    const records = await repo().listStats();
    const record = records.find(r => r.gameId === game.id);

    expect(record).toBeDefined();
    expect(record?.boardgameName).toBe("Catan");
    // Catan tracks 2×d6; its rolls come back in draw order.
    expect(record?.dice).toEqual({ count: 2, sides: 6 });
    expect(record?.diceRolls).toEqual([8, 6]);
    expect(record?.players.map(p => p.playerId).sort()).toEqual(
      [...playerIds].sort(),
    );

    const winner = record?.players.find(p => p.playerId === playerIds[0]);

    expect(winner?.isWinner).toBe(true);
    expect(winner?.score).toBe(12);

    // The turn log carries active time + overtime for the aggregation.
    expect(record?.turns).toHaveLength(1);
    expect(record?.turns[0].playerId).toBe(playerIds[0]);
    expect(record?.turns[0].durationS).toBe(30);
    expect(record?.turns[0].overtimeS).toBe(4);

    // Ongoing games never appear here.
    const ongoing = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(ongoing.id);

    expect((await repo().listStats()).some(r => r.gameId === ongoing.id)).toBe(
      false,
    );

    // A game on a boardgame without dice reports `dice: null`.
    const admin = serviceClient();
    const { data: bg } = await admin
      .from("boardgames")
      .insert({ name: `NoDice-${Date.now().toString(36)}` })
      .select("id")
      .single();
    const noDice = await repo().create({
      boardgameId: bg?.id as BoardgameId,
      configId: null,
      playerIds,
    });
    gameIds.push(noDice.id);
    await repo().end(noDice.id, [playerIds[0]]);

    const noDiceRecord = (await repo().listStats()).find(
      r => r.gameId === noDice.id,
    );

    expect(noDiceRecord?.dice).toBeNull();
    expect(noDiceRecord?.diceRolls).toEqual([]);

    // Clean the throwaway game + boardgame (game first for the FK).
    await admin.from("games").delete().eq("id", noDice.id);
    await admin
      .from("boardgames")
      .delete()
      .eq("id", bg?.id as string);
  });

  it("records final scores passed to end() (final-entry games)", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    await repo().end(
      game.id,
      [playerIds[0]],
      [
        { playerId: playerIds[0], score: 104 },
        { playerId: playerIds[1], score: 92 },
        { playerId: playerIds[2], score: 87 },
      ],
    );

    const populated = await repo().getPopulated(game.id);
    expect(
      populated?.players.find(p => p.playerId === playerIds[0])?.score,
    ).toBe(104);
    expect(
      populated?.players.find(p => p.playerId === playerIds[1])?.score,
    ).toBe(92);
  });

  it("records the per-category breakdown passed to end() (category games)", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    await repo().end(
      game.id,
      [playerIds[0]],
      [
        {
          playerId: playerIds[0],
          score: 27,
          breakdown: { ours: 12, foret: 15 },
        },
        {
          playerId: playerIds[1],
          score: 20,
          breakdown: { ours: 8, foret: 12 },
        },
      ],
    );

    const populated = await repo().getPopulated(game.id);
    const p0 = populated?.players.find(p => p.playerId === playerIds[0]);
    const p1 = populated?.players.find(p => p.playerId === playerIds[1]);

    expect(p0?.score).toBe(27);
    expect(p0?.scoreBreakdown).toEqual({ ours: 12, foret: 15 });
    expect(p1?.scoreBreakdown).toEqual({ ours: 8, foret: 12 });
    // A player with no scores passed keeps a null breakdown.
    expect(
      populated?.players.find(p => p.playerId === playerIds[2])?.scoreBreakdown,
    ).toBeNull();
  });

  it("resolves the threshold from the config value when set", async () => {
    const admin = serviceClient();
    const { data: cfg } = await admin
      .from("configs")
      .insert({
        boardgame_id: CATAN_ID,
        name: `pts-${Date.now()}`,
        values: { pointsToWin: 12 },
      })
      .select("id")
      .single();
    const cfgId = cfg?.id as string;

    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: cfgId as ConfigId,
      playerIds,
    });

    const populated = await repo().getPopulated(game.id);
    expect(populated?.winThreshold).toBe(12); // config overrides the default

    await admin.from("games").delete().eq("id", game.id);
    await admin.from("configs").delete().eq("id", cfgId);
  });

  it("raises the threshold by an option's modifier (Maître du port)", async () => {
    const admin = serviceClient();
    const { data: cfg } = await admin
      .from("configs")
      .insert({
        boardgame_id: CATAN_ID,
        name: `port-${Date.now()}`,
        values: { pointsToWin: 10, harborMaster: true },
      })
      .select("id")
      .single();
    const cfgId = cfg?.id as string;

    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: cfgId as ConfigId,
      playerIds,
    });

    const populated = await repo().getPopulated(game.id);

    expect(populated?.winThreshold).toBe(11); // 10 + 1 for the harbour master

    await admin.from("games").delete().eq("id", game.id);
    await admin.from("configs").delete().eq("id", cfgId);
  });

  it("resolves no threshold for a non-scored boardgame", async () => {
    const admin = serviceClient();
    const { data: bg } = await admin
      .from("boardgames")
      .insert({ name: `NoScore-${Date.now().toString(36)}` })
      .select("id")
      .single();
    const bgId = bg?.id as BoardgameId;

    const game = await repo().create({
      boardgameId: bgId,
      configId: null,
      playerIds,
    });

    const populated = await repo().getPopulated(game.id);
    expect(populated?.boardgame.scoring).toBeNull();
    expect(populated?.winThreshold).toBeNull();

    await admin.from("games").delete().eq("id", game.id);
    await admin.from("boardgames").delete().eq("id", bgId);
  });

  it("ends without scores (unscored path), leaving every score null", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    await repo().end(game.id, [playerIds[0]]); // no scores passed

    const populated = await repo().getPopulated(game.id);
    expect(populated?.status).toBe("ended");
    expect(populated?.players.find(p => p.isWinner)?.playerId).toBe(
      playerIds[0],
    );
    expect(populated?.players.every(p => p.score === null)).toBe(true);
  });

  it("ends on a shared victory, storing every winner and the tie-break trail", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    await repo().end(
      game.id,
      [playerIds[0], playerIds[1]],
      [
        { playerId: playerIds[0], score: 10 },
        { playerId: playerIds[1], score: 10 },
        { playerId: playerIds[2], score: 6 },
      ],
      {
        tied: [playerIds[0], playerIds[1]],
        steps: [
          {
            key: "natureTokens",
            label: "Jetons nature",
            values: { [playerIds[0]]: 3, [playerIds[1]]: 3 },
            survivors: [playerIds[0], playerIds[1]],
          },
        ],
        shared: true,
      },
    );

    const populated = await repo().getPopulated(game.id);

    expect(
      populated?.players.filter(p => p.isWinner).map(p => p.playerId),
    ).toEqual(expect.arrayContaining([playerIds[0], playerIds[1]]));
    expect(populated?.players.filter(p => p.isWinner)).toHaveLength(2);
    expect(populated?.tieBreak?.shared).toBe(true);
    expect(populated?.tieBreak?.tied).toEqual([playerIds[0], playerIds[1]]);
    expect(populated?.tieBreak?.steps[0]?.key).toBe("natureTokens");
  });

  it("endCoop marks every player a winner on a shared victory", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    await repo().endCoop(game.id, true);

    const populated = await repo().getPopulated(game.id);
    expect(populated?.status).toBe("ended");
    expect(populated?.endedAt).not.toBeNull();
    // The whole table wins together: no individual winner.
    expect(populated?.players.every(p => p.isWinner)).toBe(true);
  });

  it("endCoop marks no winner on a shared defeat", async () => {
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
    });
    gameIds.push(game.id);

    await repo().endCoop(game.id, false);

    const populated = await repo().getPopulated(game.id);
    expect(populated?.status).toBe("ended");
    expect(populated?.players.some(p => p.isWinner)).toBe(false);
  });
});

describe("games adapter — error mapping", () => {
  const BAD_UUID = "not-a-uuid";

  it("rethrows a generic error on an invalid id (getPopulated/advanceTurn/end)", async () => {
    // An invalid UUID is a 22P02 DB error → the generic rethrow in each method.
    await expect(repo().getPopulated(BAD_UUID as GameId)).rejects.toThrow();

    await expect(
      repo().advanceTurn(BAD_UUID as GameId, 10, 0, 0, 0),
    ).rejects.toThrow();

    await expect(
      repo().end(BAD_UUID as GameId, [playerIds[0]]),
    ).rejects.toThrow();

    await expect(repo().endCoop(BAD_UUID as GameId, true)).rejects.toThrow();
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

describe("games adapter — recording a finished game", () => {
  it("stores an already-finished game with scores, winner and end date", async () => {
    const endedAt = "2026-02-10T12:00:00.000Z";
    const game = await repo().createFinished({
      boardgameId: CATAN_ID,
      endedAt,
      winnerIds: [playerIds[1]],
      players: [
        { playerId: playerIds[0], seatOrder: 0, score: 8, breakdown: null },
        {
          playerId: playerIds[1],
          seatOrder: 1,
          score: 11,
          breakdown: { a: 6, b: 5 },
        },
        { playerId: playerIds[2], seatOrder: 2, score: 7, breakdown: null },
      ],
    });
    gameIds.push(game.id);

    expect(game.status).toBe("ended");
    expect(new Date(game.endedAt ?? "").toISOString()).toBe(endedAt);

    // Never listed among ongoing games; shows under ended, and counts in stats.
    expect((await repo().list()).some(g => g.id === game.id)).toBe(false);
    expect(
      (await repo().list({ status: "ended" })).some(g => g.id === game.id),
    ).toBe(true);
    expect((await repo().listStats()).some(r => r.gameId === game.id)).toBe(
      true,
    );

    const populated = await repo().getPopulated(game.id);
    const p0 = populated?.players.find(p => p.playerId === playerIds[0]);
    const p1 = populated?.players.find(p => p.playerId === playerIds[1]);

    expect(p1?.isWinner).toBe(true);
    expect(p1?.score).toBe(11);
    expect(p1?.scoreBreakdown).toEqual({ a: 6, b: 5 });
    expect(p0?.isWinner).toBe(false);
    expect(p0?.score).toBe(8);
    expect(p0?.scoreBreakdown).toBeNull();
  });

  it("stores an unscored finished game (null scores, just a winner)", async () => {
    const game = await repo().createFinished({
      boardgameId: CATAN_ID,
      endedAt: new Date().toISOString(),
      winnerIds: [playerIds[0]],
      players: playerIds.map((id, i) => ({
        playerId: id,
        seatOrder: i,
        score: null,
        breakdown: null,
      })),
    });
    gameIds.push(game.id);

    const populated = await repo().getPopulated(game.id);
    const winner = populated?.players.find(p => p.playerId === playerIds[0]);

    expect(winner?.isWinner).toBe(true);
    expect(winner?.score).toBeNull();
    // A single winner is no ex æquo: nothing to explain in the recap.
    expect(populated?.tieBreak).toBeNull();
  });

  it("stores a finished game with a shared victory (several winners)", async () => {
    const game = await repo().createFinished({
      boardgameId: CATAN_ID,
      endedAt: new Date().toISOString(),
      winnerIds: [playerIds[0], playerIds[2]],
      players: playerIds.map((id, i) => ({
        playerId: id,
        seatOrder: i,
        score: i === 1 ? 5 : 9,
        breakdown: null,
      })),
    });
    gameIds.push(game.id);

    const populated = await repo().getPopulated(game.id);

    expect(populated?.players.filter(p => p.isWinner)).toHaveLength(2);
    expect(populated?.tieBreak?.shared).toBe(true);
    expect(populated?.tieBreak?.tied).toEqual([playerIds[0], playerIds[2]]);
    expect(populated?.tieBreak?.steps).toEqual([]);
  });

  it("stores the manches of a finished game entered with its goal detail", async () => {
    // Only Catan carries a written-down id; every game seeded since draws one
    // at insert, so it has to be looked up by name.
    const { data: wingspan } = await serviceClient()
      .from("boardgames")
      .select("id")
      .eq("name", "Wingspan")
      .single();

    const game = await repo().createFinished({
      boardgameId: wingspan?.id as BoardgameId,
      endedAt: new Date().toISOString(),
      winnerIds: [playerIds[0]],
      players: playerIds.map((id, i) => ({
        playerId: id,
        seatOrder: i,
        score: i === 0 ? 90 : 70,
        breakdown: null,
      })),
      stages: [
        { stage: 1, goalKey: "totalBirds", goalParams: {}, turns: 8 },
        {
          stage: 2,
          goalKey: "eggsInHabitat",
          goalParams: { habitat: "sea" },
          turns: 7,
        },
      ],
      stageScores: [
        { stage: 1, playerId: playerIds[0], points: 4 },
        { stage: 1, playerId: playerIds[1], points: 1 },
        { stage: 2, playerId: playerIds[0], points: 3 },
        { stage: 2, playerId: playerIds[1], points: 0 },
      ],
    });
    gameIds.push(game.id);

    const populated = await repo().getPopulated(game.id);

    expect(populated?.stages).toHaveLength(2);
    expect(populated?.stages[1]).toMatchObject({
      stage: 2,
      goalKey: "eggsInHabitat",
      goalParams: { habitat: "sea" },
      turns: 7,
    });
    expect(populated?.stageScores).toHaveLength(4);

    // The goal detail is what the stats read a tile's worth from, so a game
    // entered after the fact must reach them exactly like a game played live.
    const record = (await repo().listStats()).find(r => r.gameId === game.id);

    expect(record?.stageGoals).toHaveLength(2);
    expect(record?.stageGoals?.[0]?.points).toContainEqual({
      playerId: playerIds[0],
      points: 4,
    });
  });

  it("rejects a manche score attributed to someone who wasn't there", async () => {
    const admin = serviceClient();
    const { data: wingspan } = await admin
      .from("boardgames")
      .select("id")
      .eq("name", "Wingspan")
      .single();
    const before = new Set(
      ((await admin.from("games").select("id")).data ?? []).map(g => g.id),
    );

    await expect(
      repo().createFinished({
        boardgameId: wingspan?.id as BoardgameId,
        endedAt: new Date().toISOString(),
        winnerIds: [playerIds[0]],
        players: playerIds.map((id, i) => ({
          playerId: id,
          seatOrder: i,
          score: 50,
          breakdown: null,
        })),
        stages: [{ stage: 1, goalKey: "totalBirds", goalParams: {}, turns: 8 }],
        stageScores: [
          { stage: 1, playerId: crypto.randomUUID() as PlayerId, points: 4 },
        ],
      }),
    ).rejects.toThrow(/Enregistrement des objectifs/);

    // Track the orphan game (inserted before game_stage_scores failed).
    const after = (await admin.from("games").select("id")).data ?? [];
    for (const g of after) {
      if (!before.has(g.id)) {
        gameIds.push(g.id as GameId);
      }
    }
  });

  it("rejects a bad boardgame id, then an unknown player (FK violations)", async () => {
    await expect(
      repo().createFinished({
        boardgameId: "not-a-uuid" as BoardgameId,
        endedAt: new Date().toISOString(),
        winnerIds: [playerIds[0]],
        players: [
          {
            playerId: playerIds[0],
            seatOrder: 0,
            score: null,
            breakdown: null,
          },
        ],
      }),
    ).rejects.toThrow(/partie terminée/);

    const admin = serviceClient();
    const before = new Set(
      ((await admin.from("games").select("id")).data ?? []).map(g => g.id),
    );
    const bad = crypto.randomUUID() as PlayerId;

    await expect(
      repo().createFinished({
        boardgameId: CATAN_ID,
        endedAt: new Date().toISOString(),
        winnerIds: [playerIds[0]],
        players: [
          { playerId: playerIds[0], seatOrder: 0, score: 1, breakdown: null },
          { playerId: bad, seatOrder: 1, score: 2, breakdown: null },
        ],
      }),
    ).rejects.toThrow(/Ajout des joueurs/);

    // Track the orphan games row (inserted before game_players failed).
    const after = (await admin.from("games").select("id")).data ?? [];
    for (const g of after) {
      if (!before.has(g.id)) {
        gameIds.push(g.id as GameId);
      }
    }
  });
});

describe("games adapter — extensions", () => {
  it("records active extensions and locks the win target to the scenario", async () => {
    const admin = serviceClient();
    const { data: ext } = await admin
      .from("extensions")
      .select("id")
      .eq("name", "Catan - Marins")
      .single();
    const extId = ext?.id as ExtensionId;
    const { data: sc } = await admin
      .from("extension_scenarios")
      .select("id")
      .eq("name", "Les quatre îles")
      .single();
    const scId = sc?.id as ExtensionScenarioId;

    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
      extensionIds: [extId],
      scenarioByExtension: { [extId]: scId },
    });
    gameIds.push(game.id);

    const populated = await repo().getPopulated(game.id);

    expect(populated?.extensions.map(e => e.name)).toEqual(["Catan - Marins"]);
    expect(populated?.extensions[0].scenarioId).toBe(scId);
    // Four Islands imposes 13, overriding Catan's editable pointsToWin (10),
    // with no extension modifier.
    expect(populated?.winThreshold).toBe(13);

    // The list carries it too: the history is where a Marins game has to stop
    // looking like any other game of Catan.
    const listed = (await repo().list()).find(g => g.id === game.id);

    expect(listed?.extensions).toEqual([
      { name: "Catan - Marins", scenarioName: "Les quatre îles" },
    ]);
  });

  it("without a scenario, keeps the base game's configured win target", async () => {
    const admin = serviceClient();
    const { data: ext } = await admin
      .from("extensions")
      .select("id")
      .eq("name", "Catan - Marins")
      .single();
    const extId = ext?.id as ExtensionId;

    // The extension active but no scenario chosen (scenario_id null).
    const game = await repo().create({
      boardgameId: CATAN_ID,
      configId: null,
      playerIds,
      extensionIds: [extId],
    });
    gameIds.push(game.id);

    const populated = await repo().getPopulated(game.id);

    expect(populated?.extensions[0].scenarioId).toBeNull();
    // No scenario → the win target falls back to the config template default (10).
    expect(populated?.winThreshold).toBe(10);

    const listed = (await repo().list()).find(g => g.id === game.id);

    expect(listed?.extensions).toEqual([
      { name: "Catan - Marins", scenarioName: null },
    ]);
  });

  it("rejects an unknown extension id (FK violation)", async () => {
    const admin = serviceClient();
    const before = new Set(
      ((await admin.from("games").select("id")).data ?? []).map(g => g.id),
    );
    const bad = crypto.randomUUID() as ExtensionId;

    await expect(
      repo().create({
        boardgameId: CATAN_ID,
        configId: null,
        playerIds,
        extensionIds: [bad],
      }),
    ).rejects.toThrow(/Ajout des extensions/);

    // Track the orphan game (inserted before game_extensions failed).
    const after = (await admin.from("games").select("id")).data ?? [];
    for (const g of after) {
      if (!before.has(g.id)) {
        gameIds.push(g.id as GameId);
      }
    }
  });
});
