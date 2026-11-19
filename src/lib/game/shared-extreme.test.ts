import { describe, expect, it } from "vitest";

import type { PlayerId, StageScore } from "@/lib/domain";

import { commonStage, sharedExtreme } from "./shared-extreme";

const [A, B, C, D] = ["a", "b", "c", "d"] as PlayerId[];
const PLAYERS = [
  { playerId: A, name: "Ann" },
  { playerId: B, name: "Bob" },
  { playerId: C, name: "Cléo" },
  { playerId: D, name: "Dan" },
];

function score(playerId: PlayerId, stage: number, points: number): StageScore {
  return { playerId, stage, points };
}

const lowest = (points: number, than: number) => points < than;

describe("sharedExtreme", () => {
  it("names the one player who took the extreme", () => {
    expect(
      sharedExtreme(
        PLAYERS,
        [score(A, 1, -5), score(B, 1, -15), score(C, 2, 10)],
        lowest,
      ),
    ).toEqual({ points: -15, who: [{ name: "Bob", stages: [1] }] });
  });

  it("names every player who tied for it, in seat order", () => {
    expect(
      sharedExtreme(
        PLAYERS,
        [score(B, 4, -5), score(A, 3, -5), score(B, 2, -5), score(C, 1, 10)],
        lowest,
      ),
    ).toEqual({
      points: -5,
      who: [
        { name: "Ann", stages: [3] },
        { name: "Bob", stages: [2, 4] },
      ],
    });
  });

  it("keeps quiet when most of the table took it", () => {
    expect(
      sharedExtreme(
        PLAYERS,
        [score(A, 3, -5), score(B, 4, -5), score(C, 4, -5), score(D, 4, 10)],
        lowest,
      ),
    ).toBeNull();
  });

  it("has nothing to say when nothing beat the bar", () => {
    expect(sharedExtreme(PLAYERS, [score(A, 1, 0)], lowest)).toBeNull();
    expect(sharedExtreme(PLAYERS, [], lowest)).toBeNull();
  });

  it("names a player who left the table last, with a question mark", () => {
    expect(
      sharedExtreme(
        PLAYERS,
        [score("z" as PlayerId, 1, -5), score(B, 2, -5)],
        lowest,
      ),
    ).toEqual({
      points: -5,
      who: [
        { name: "Bob", stages: [2] },
        { name: "?", stages: [1] },
      ],
    });
  });
});

describe("commonStage", () => {
  it("is the manche everybody took the mark on", () => {
    expect(
      commonStage([
        { name: "Ann", stages: [4] },
        { name: "Bob", stages: [4] },
      ]),
    ).toBe(4);
  });

  it("is null when the mark was taken on several manches", () => {
    expect(
      commonStage([
        { name: "Ann", stages: [3] },
        { name: "Bob", stages: [4] },
      ]),
    ).toBeNull();
    expect(commonStage([{ name: "Ann", stages: [2, 4] }])).toBeNull();
  });
});
