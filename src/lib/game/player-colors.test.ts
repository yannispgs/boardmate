import { describe, expect, it } from "vitest";

import { PLAYER_COLORS, playerColorOf } from "./player-colors";

const players = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("playerColorOf", () => {
  it("gives each seat its own colour, in order", () => {
    expect(playerColorOf(players, "a")).toBe(PLAYER_COLORS[0]);
    expect(playerColorOf(players, "b")).toBe(PLAYER_COLORS[1]);
    expect(playerColorOf(players, "c")).toBe(PLAYER_COLORS[2]);
  });

  it("cycles the palette when there are more players than colours", () => {
    const many = PLAYER_COLORS.map((_, i) => ({ id: `p${i}` })).concat([
      { id: "extra" },
    ]);

    expect(playerColorOf(many, "extra")).toBe(PLAYER_COLORS[0]);
  });

  it("falls back to the first colour for an unknown player", () => {
    expect(playerColorOf(players, "nobody")).toBe(PLAYER_COLORS[0]);
  });
});
