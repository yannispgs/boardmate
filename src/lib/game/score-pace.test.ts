import { describe, expect, it } from "vitest";

import type { PlayerId } from "@/lib/domain";
import type { PacePlayer } from "@/lib/game/score-pace";
import {
  formatPerTurn,
  nearMisses,
  pointsPerTurn,
  scorePace,
} from "@/lib/game/score-pace";

function player(
  name: string,
  score: number | null,
  turnCount: number,
): PacePlayer {
  return { playerId: `p-${name}` as PlayerId, name, score, turnCount };
}

describe("pointsPerTurn", () => {
  it("divides the score by the turns played", () => {
    expect(pointsPerTurn(player("Yannis", 84, 12))).toBe(7);
  });

  it("has no rate without a score", () => {
    expect(pointsPerTurn(player("Yannis", null, 12))).toBeNull();
  });

  it("has no rate without a turn", () => {
    expect(pointsPerTurn(player("Yannis", 84, 0))).toBeNull();
  });

  it("keeps the fraction, it is a reading not a score", () => {
    expect(pointsPerTurn(player("Yannis", 10, 4))).toBe(2.5);
  });
});

describe("formatPerTurn", () => {
  it("keeps one decimal, with a French comma", () => {
    expect(formatPerTurn(72 / 11)).toBe("6,5");
  });

  it("shows the decimal even on a round rate", () => {
    expect(formatPerTurn(7)).toBe("7,0");
  });

  it("shows a dash when there is no rate", () => {
    expect(formatPerTurn(null)).toBe("—");
  });
});

describe("scorePace", () => {
  it("ranks by score, best first, and adds the rate", () => {
    const paced = scorePace([
      player("Marie", 60, 12),
      player("Yannis", 84, 12),
      player("Léo", 72, 11),
    ]);

    expect(paced.map(p => p.name)).toEqual(["Yannis", "Léo", "Marie"]);
    expect(paced.map(p => p.perTurn)).toEqual([7, 72 / 11, 5]);
  });

  it("leaves the input array untouched", () => {
    const players = [player("Marie", 60, 12), player("Yannis", 84, 12)];

    scorePace(players);

    expect(players.map(p => p.name)).toEqual(["Marie", "Yannis"]);
  });

  it("sorts an unscored player as a zero", () => {
    const paced = scorePace([player("Marie", null, 12), player("Léo", 3, 12)]);

    expect(paced.map(p => p.name)).toEqual(["Léo", "Marie"]);
    expect(paced[1].perTurn).toBeNull();
  });
});

describe("nearMisses", () => {
  it("reports the trailing player one turn short of going past", () => {
    // Léo: 72 in 11 turns (6.5/turn) → 78.5 > 78, and he played one turn fewer.
    const misses = nearMisses([
      player("Yannis", 78, 12),
      player("Léo", 72, 11),
    ]);

    expect(misses).toHaveLength(1);
    expect(misses[0].behind.name).toBe("Léo");
    expect(misses[0].ahead.name).toBe("Yannis");
    expect(misses[0].gain).toBe(7);
  });

  it("says nothing when the extra turn would not have been enough", () => {
    // Léo: 60 in 11 turns (~5.5/turn) → 66 < 78.
    expect(
      nearMisses([player("Yannis", 78, 12), player("Léo", 60, 11)]),
    ).toEqual([]);
  });

  it("says nothing when the extra turn only levels the scores", () => {
    // Léo: 70 in 10 turns (7/turn) → 77, exactly Yannis. Not past, no what-if.
    expect(
      nearMisses([player("Yannis", 77, 11), player("Léo", 70, 10)]),
    ).toEqual([]);
  });

  it("says nothing when both played as many turns", () => {
    expect(
      nearMisses([player("Yannis", 78, 12), player("Léo", 72, 12)]),
    ).toEqual([]);
  });

  it("says nothing when the trailing player played more turns", () => {
    expect(
      nearMisses([player("Yannis", 78, 11), player("Léo", 72, 12)]),
    ).toEqual([]);
  });

  it("says nothing between two players on the same score", () => {
    expect(
      nearMisses([player("Yannis", 72, 12), player("Léo", 72, 11)]),
    ).toEqual([]);
  });

  it("ignores a pair where the leader has no score", () => {
    expect(
      nearMisses([player("Yannis", null, 12), player("Léo", -5, 11)]),
    ).toEqual([]);
  });

  it("ignores a pair where the trailing player has no score", () => {
    expect(
      nearMisses([player("Yannis", 78, 12), player("Léo", null, 11)]),
    ).toEqual([]);
  });

  it("credits nothing to a player who never played", () => {
    // No turn played, so no pace to extrapolate from: one more turn is worth 0.
    expect(nearMisses([player("Yannis", 78, 12), player("Léo", 0, 0)])).toEqual(
      [],
    );
  });

  it("only looks at neighbours in the ranking", () => {
    // Marie would pass Yannis on her pace, but Léo stands between them.
    const misses = nearMisses([
      player("Yannis", 78, 12),
      player("Léo", 40, 12),
      player("Marie", 38, 11),
    ]);

    expect(misses.map(m => m.behind.name)).toEqual(["Marie"]);
    expect(misses[0].ahead.name).toBe("Léo");
  });

  it("reports every close pair of a table", () => {
    const misses = nearMisses([
      player("Yannis", 78, 12),
      player("Léo", 72, 11),
      player("Marie", 66, 10),
    ]);

    expect(misses.map(m => `${m.behind.name}>${m.ahead.name}`)).toEqual([
      "Léo>Yannis",
      "Marie>Léo",
    ]);
  });
});
