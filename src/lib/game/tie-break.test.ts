import { describe, expect, it } from "vitest";

import type { PlayerId, TieBreakRecord, TieBreakRule } from "@/lib/domain";

import {
  formatNames,
  recordForWinners,
  resolveTieBreak,
  tieBreakRecord,
} from "./tie-break";

const p = (id: string): PlayerId => id as PlayerId;

const score = (id: string, value: number) => ({
  playerId: p(id),
  score: value,
});

const askMost: TieBreakRule = {
  key: "nature",
  label: "Le plus de jetons nature",
  source: "ask",
};

const askFewest: TieBreakRule = {
  key: "splito",
  label: "Le moins de cartes Splito",
  direction: "lowest",
  source: "ask",
};

const currentTurn: TieBreakRule = {
  key: "currentTurn",
  label: "Celui dont c'est le tour",
  source: "currentTurn",
};

describe("formatNames", () => {
  it("says nothing for nobody", () => {
    expect(formatNames([])).toBe("");
  });

  it("leaves a lone name alone", () => {
    expect(formatNames(["Alice"])).toBe("Alice");
  });

  it("joins two names with « et »", () => {
    expect(formatNames(["Alice", "Bob"])).toBe("Alice et Bob");
  });

  it("commas all but the last of three names", () => {
    expect(formatNames(["Alice", "Bob", "Chloé"])).toBe("Alice, Bob et Chloé");
  });
});

describe("resolveTieBreak", () => {
  it("settles a clear leader without applying any rule", () => {
    const result = resolveTieBreak([score("a", 12), score("b", 9)], "highest", [
      askMost,
    ]);

    expect(result.tied).toEqual([p("a")]);
    expect(result.winners).toEqual([p("a")]);
    expect(result.steps).toEqual([]);
    expect(result.pending).toBeNull();
    expect(result.shared).toBe(false);
  });

  it("finds the leader at the low end for a lowest-wins game", () => {
    const result = resolveTieBreak(
      [score("a", 12), score("b", 9)],
      "lowest",
      [],
    );

    expect(result.winners).toEqual([p("b")]);
  });

  it("has no leader at all when nobody played", () => {
    const result = resolveTieBreak([], "highest", [askMost]);

    expect(result.tied).toEqual([]);
    expect(result.winners).toEqual([]);
  });

  it("asks for the values a tie needs before deciding anything", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10), score("c", 4)],
      "highest",
      [askMost],
    );

    expect(result.tied).toEqual([p("a"), p("b")]);
    expect(result.pending).toBe(askMost);
    expect(result.asking).toEqual([p("a"), p("b")]);
    expect(result.winners).toEqual([]);
  });

  it("keeps asking while only part of the tied players answered", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10)],
      "highest",
      [askMost],
      { answers: { nature: { a: 3 } } },
    );

    expect(result.pending).toBe(askMost);
  });

  it("separates the tied players on the answered values", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10)],
      "highest",
      [askMost],
      { answers: { nature: { a: 3, b: 5 } } },
    );

    expect(result.winners).toEqual([p("b")]);
    expect(result.shared).toBe(false);
    expect(result.steps).toEqual([
      {
        key: "nature",
        label: "Le plus de jetons nature",
        values: { a: 3, b: 5 },
        survivors: [p("b")],
      },
    ]);
  });

  it("honours a rule won by the lowest value", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10)],
      "highest",
      [askFewest],
      { answers: { splito: { a: 3, b: 5 } } },
    );

    expect(result.winners).toEqual([p("a")]);
  });

  it("awards the tie to whoever holds the turn", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10)],
      "highest",
      [currentTurn],
      { currentPlayerId: p("b") },
    );

    expect(result.winners).toEqual([p("b")]);
    expect(result.steps[0].values).toEqual({ a: 0, b: 1 });
  });

  it("shares the victory when the turn holder is not one of the tied players", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10)],
      "highest",
      [currentTurn],
      { currentPlayerId: p("c") },
    );

    expect(result.winners).toEqual([p("a"), p("b")]);
    expect(result.shared).toBe(true);
  });

  it("shares the victory when the game has no rule at all", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10)],
      "highest",
      [],
    );

    expect(result.winners).toEqual([p("a"), p("b")]);
    expect(result.shared).toBe(true);
    expect(result.steps).toEqual([]);
  });

  it("falls through to the next rule while players stay level", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10), score("c", 10)],
      "highest",
      [askMost, askFewest],
      { answers: { nature: { a: 5, b: 5, c: 1 }, splito: { a: 2, b: 7 } } },
    );

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].survivors).toEqual([p("a"), p("b")]);
    expect(result.winners).toEqual([p("a")]);
  });

  it("stops on the first rule that already decided", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10)],
      "highest",
      [askMost, askFewest],
      { answers: { nature: { a: 5, b: 1 } } },
    );

    expect(result.steps).toHaveLength(1);
    expect(result.pending).toBeNull();
    expect(result.winners).toEqual([p("a")]);
  });

  it("asks the later rule only about the players it still has to separate", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10), score("c", 10)],
      "highest",
      [askMost, askFewest],
      { answers: { nature: { a: 5, b: 5, c: 1 } } },
    );

    expect(result.pending).toBe(askFewest);
    expect(result.asking).toEqual([p("a"), p("b")]);
  });
});

describe("tieBreakRecord", () => {
  it("records nothing when a single player led", () => {
    const result = resolveTieBreak([score("a", 10)], "highest", []);

    expect(tieBreakRecord(result)).toBeNull();
  });

  it("records who was tied and what settled it", () => {
    const result = resolveTieBreak(
      [score("a", 10), score("b", 10)],
      "highest",
      [askMost],
      { answers: { nature: { a: 3, b: 5 } } },
    );

    expect(tieBreakRecord(result)).toEqual({
      tied: [p("a"), p("b")],
      steps: result.steps,
      shared: false,
    });
  });
});

describe("recordForWinners", () => {
  const record: TieBreakRecord = {
    tied: [p("a"), p("b")],
    steps: [
      {
        key: "nature",
        label: "Le plus de jetons nature",
        values: { a: 3, b: 5 },
        survivors: [p("b")],
      },
    ],
    shared: false,
  };

  it("leaves a game that never tied alone", () => {
    expect(recordForWinners(null, [p("a")])).toBeNull();
  });

  it("keeps the applied rules when the table confirms the proposal", () => {
    expect(recordForWinners(record, [p("b")])).toEqual(record);
  });

  it("drops the rules when the table names a different winner", () => {
    expect(recordForWinners(record, [p("a")])).toEqual({
      tied: [p("a"), p("b")],
      steps: [],
      shared: false,
    });
  });

  it("drops the rules when the table forces a shared victory", () => {
    expect(recordForWinners(record, [p("a"), p("b")])).toEqual({
      tied: [p("a"), p("b")],
      steps: [],
      shared: true,
    });
  });

  it("keeps a rule-less shared victory as shared", () => {
    const noRule: TieBreakRecord = {
      tied: [p("a"), p("b")],
      steps: [],
      shared: true,
    };

    expect(recordForWinners(noRule, [p("a"), p("b")])).toEqual(noRule);
  });
});
