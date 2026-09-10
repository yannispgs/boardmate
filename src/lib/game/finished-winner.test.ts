import { describe, expect, it } from "vitest";

import type { Player, PlayerId, ScoringSpec, TieBreakRule } from "@/lib/domain";

import { finishedWinners } from "./finished-winner";

const player = (id: string): Player => ({
  id: id as PlayerId,
  name: id,
  isActive: true,
  hasPlayed: true,
  createdAt: "2026-01-01T12:00:00.000Z",
});

const ann = player("ann");
const bob = player("bob");

const splitoRule: TieBreakRule = {
  key: "splitoCards",
  label: "Le moins de cartes Splito",
  direction: "lowest",
  source: "ask",
};

const scored: ScoringSpec = {
  timing: "final",
  entry: "total",
  winCondition: { type: "highest" },
};

describe("finishedWinners", () => {
  it("carries a lone top scorer without asking anything", () => {
    const choice = finishedWinners(scored, 2, [ann]);

    expect(choice.asked).toBe(false);
    expect(choice.preselected).toEqual([ann.id]);
    expect(choice.tied).toBe(false);
  });

  /**
   * A sheet half filled in has no leader to read yet. Nothing is proposed and
   * nothing is asked either: the question only exists once every score is in.
   */
  it("proposes nobody while the scores are still incomplete", () => {
    const choice = finishedWinners(scored, 2, []);

    expect(choice.asked).toBe(false);
    expect(choice.preselected).toEqual([]);
  });

  /**
   * The whole point of the block: co-leaders are **not** proposed. Handing back
   * both names would file a shared victory for a table that only forgot to
   * answer, and the form has nothing to submit until it does.
   */
  it("asks on a tie and proposes neither of the co-leaders", () => {
    const choice = finishedWinners(scored, 2, [ann, bob]);

    expect(choice.asked).toBe(true);
    expect(choice.preselected).toEqual([]);
    expect(choice.tied).toBe(true);
  });

  it("names the game's own rules so the table can apply them", () => {
    const choice = finishedWinners({ ...scored, tieBreak: [splitoRule] }, 2, [
      ann,
      bob,
    ]);

    expect(choice.rules).toEqual([splitoRule]);
  });

  it("has no rule to name on a game whose rulebook breaks no tie", () => {
    expect(finishedWinners(scored, 2, [ann, bob]).rules).toEqual([]);
  });

  /**
   * An unscored game has no sheet to read a leader off, so the winner is always
   * designated — and there is no tie to explain, only a blank to fill.
   */
  it("always asks on an unscored game, with nothing to explain", () => {
    const choice = finishedWinners(null, 2, [ann, bob]);

    expect(choice.asked).toBe(true);
    expect(choice.preselected).toEqual([]);
    expect(choice.rules).toEqual([]);
    expect(choice.tied).toBe(false);
  });

  it("asks nothing on an unscored game with nobody at the table", () => {
    expect(finishedWinners(null, 0, []).asked).toBe(false);
  });
});
