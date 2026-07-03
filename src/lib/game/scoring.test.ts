import { describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";

import { leaderByScore } from "./scoring";

const p = (n: string) => n as PlayerId;

describe("leaderByScore", () => {
  const entries = [
    { playerId: p("a"), score: 92 },
    { playerId: p("b"), score: 104 },
    { playerId: p("c"), score: 87 },
  ];

  it("picks the highest when winnerBy is highest", () => {
    expect(leaderByScore(entries, "highest")).toBe("b");
  });

  it("picks the lowest when winnerBy is lowest", () => {
    expect(leaderByScore(entries, "lowest")).toBe("c");
  });

  it("keeps the first among tied leaders", () => {
    const tied = [
      { playerId: p("a"), score: 50 },
      { playerId: p("b"), score: 50 },
    ];

    expect(leaderByScore(tied, "highest")).toBe("a");
  });

  it("ignores players without a score", () => {
    const partial = [
      { playerId: p("a"), score: null },
      { playerId: p("b"), score: 10 },
    ];

    expect(leaderByScore(partial, "highest")).toBe("b");
  });

  it("returns null when nobody has a score", () => {
    expect(
      leaderByScore([{ playerId: p("a"), score: null }], "highest"),
    ).toBeNull();
  });
});
