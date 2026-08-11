import { describe, expect, it } from "vitest";

import type { PlayerId, ScoreSheetItem } from "@/lib/domain";
import { categoryOutcome, pairOutcome, totalOutcome } from "./end-outcome";

const id = (name: string) => name as PlayerId;

const sheet: ScoreSheetItem[] = [
  { key: "birds", label: "Oiseaux" },
  { key: "cones", label: "Pommes de pin" },
];

describe("categoryOutcome", () => {
  it("sums each player's sheet, ranks them and crowns the lone leader", () => {
    const outcome = categoryOutcome(
      sheet,
      {
        ana: { birds: 10, cones: 3 },
        bob: { birds: 4, cones: 2 },
      },
      [id("ana"), id("bob")],
    );

    expect(outcome.scores).toEqual([
      { playerId: "ana", score: 13, breakdown: { birds: 10, cones: 3 } },
      { playerId: "bob", score: 6, breakdown: { birds: 4, cones: 2 } },
    ]);
    expect(outcome.ranking.map(r => [r.playerId, r.rank])).toEqual([
      ["ana", 1],
      ["bob", 2],
    ]);
    expect(outcome.winners).toEqual(["ana"]);
    expect(outcome.piles).toBeNull();
    expect(outcome.values).toEqual({
      ana: { birds: 10, cones: 3 },
      bob: { birds: 4, cones: 2 },
    });
  });

  it("names nobody while the leaders are level", () => {
    const outcome = categoryOutcome(
      sheet,
      { ana: { birds: 5 }, bob: { birds: 5 } },
      [id("ana"), id("bob")],
    );

    expect(outcome.winners).toEqual([]);
    expect(outcome.ranking.every(r => r.rank === 1)).toBe(true);
  });

  it("scores a player whose sheet was never filled in as zero", () => {
    const outcome = categoryOutcome(sheet, {}, [id("ana")]);

    expect(outcome.scores).toEqual([
      { playerId: "ana", score: 0, breakdown: {} },
    ]);
  });
});

describe("pairOutcome", () => {
  it("multiplies each seat's two piles, ranks them and keeps the piles", () => {
    const seats = [id("ana"), id("bob"), id("cid")];
    // Piles round the circle: ana|bob = 2, bob|cid = 5, cid|ana = 3.
    const piles = { pile0: 2, pile1: 5, pile2: 3 };
    const outcome = pairOutcome(seats, piles);

    expect(outcome.scores).toEqual([
      { playerId: "ana", score: 6, breakdown: { left: 3, right: 2 } },
      { playerId: "bob", score: 10, breakdown: { left: 2, right: 5 } },
      { playerId: "cid", score: 15, breakdown: { left: 5, right: 3 } },
    ]);
    expect(outcome.ranking.map(r => r.playerId)).toEqual(["cid", "bob", "ana"]);
    expect(outcome.winners).toEqual(["cid"]);
    expect(outcome.piles).toBe(piles);
    expect(outcome.values).toBeNull();
  });

  it("names nobody when two seats end on the same product", () => {
    const seats = [id("ana"), id("bob")];
    const outcome = pairOutcome(seats, { pile0: 4, pile1: 4 });

    expect(outcome.winners).toEqual([]);
  });
});

describe("totalOutcome", () => {
  const scores = [
    { playerId: id("ana"), score: 12 },
    { playerId: id("bob"), score: 30 },
  ];

  it("crowns the highest total by default", () => {
    const outcome = totalOutcome(scores, { type: "highest" }, null);

    expect(outcome.winners).toEqual(["bob"]);
    expect(outcome.ranking.map(r => r.playerId)).toEqual(["bob", "ana"]);
    expect(outcome.values).toBeNull();
    expect(outcome.piles).toBeNull();
  });

  it("crowns the lowest total when that is how the game is won", () => {
    const outcome = totalOutcome(scores, { type: "lowest" }, null);

    expect(outcome.winners).toEqual(["ana"]);
    expect(outcome.ranking.map(r => r.playerId)).toEqual(["ana", "bob"]);
  });

  it("reads an unscored game highest-first", () => {
    const outcome = totalOutcome(scores, null, null);

    expect(outcome.winners).toEqual(["bob"]);
  });

  it("lets the table name a winner over the leader", () => {
    const outcome = totalOutcome(scores, { type: "highest" }, id("ana"));

    expect(outcome.winners).toEqual(["ana"]);
  });

  it("names nobody when the table finished level", () => {
    const outcome = totalOutcome(
      [
        { playerId: id("ana"), score: 7 },
        { playerId: id("bob"), score: 7 },
      ],
      { type: "highest" },
      null,
    );

    expect(outcome.winners).toEqual([]);
  });
});
