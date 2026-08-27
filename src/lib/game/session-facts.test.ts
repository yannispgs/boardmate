import { describe, expect, it } from "vitest";

import type { BoardgameId, PlayerId, ScoringSpec } from "@/lib/domain";
import {
  comparableScores,
  MIN_PARTIES,
  remarkableScore,
  sessionFacts,
} from "./session-facts";
import type { SessionParty } from "./session-stats";

const ANNE = "p-anne" as PlayerId;
const BOB = "p-bob" as PlayerId;
const CLARA = "p-clara" as PlayerId;

const NAMES: Record<string, string> = {
  [ANNE]: "Anne",
  [BOB]: "Bob",
  [CLARA]: "Clara",
};

/** One party of the sitting: who sat at it, their score, and who took it. */
function party(
  scores: Array<[PlayerId, number | null]>,
  winners: PlayerId[],
): SessionParty {
  return {
    ended: true,
    players: scores.map(([id, score]) => ({
      id,
      name: NAMES[id],
      isWinner: winners.includes(id),
      score,
    })),
  };
}

/** An evening long enough to be read, padded with parties nobody remembers. */
function evening(...parties: SessionParty[]): SessionParty[] {
  const filler = party(
    [
      [ANNE, 5],
      [BOB, 5],
    ],
    [],
  );

  while (parties.length < MIN_PARTIES) {
    parties.push(filler);
  }

  return parties;
}

function textOf(facts: ReturnType<typeof sessionFacts>, kind: string): string {
  return facts.find(fact => fact.kind === kind)?.text ?? "";
}

describe("sessionFacts", () => {
  it("says nothing of an evening too short to have a story", () => {
    const parties = [
      party([[ANNE, 10]], [ANNE]),
      party([[ANNE, 10]], [ANNE]),
      party([[ANNE, 10]], [ANNE]),
      party([[ANNE, 10]], [ANNE]),
    ];

    expect(
      sessionFacts({ parties, direction: "highest", remarkable: null }),
    ).toEqual([]);
  });

  it("counts only the finished parties towards the minimum", () => {
    // Five parties, but the fifth is still on the table: four is not an evening.
    const parties = [
      ...evening(party([[ANNE, 10]], [ANNE])).slice(0, 4),
      { ended: false, players: [] },
    ];

    expect(
      sessionFacts({ parties, direction: "highest", remarkable: null }),
    ).toEqual([]);
  });

  it("names the biggest pile of the evening", () => {
    const parties = evening(
      party(
        [
          [ANNE, 142],
          [BOB, 30],
        ],
        [ANNE],
      ),
    );
    const facts = sessionFacts({
      parties,
      direction: "highest",
      remarkable: null,
    });

    expect(textOf(facts, "best-score")).toBe(
      "Plus gros score de la soirée : Anne, 142 points",
    );
  });

  it("names the smallest pile when the small score wins", () => {
    const parties = evening(
      party(
        [
          [ANNE, 3],
          [BOB, 60],
        ],
        [ANNE],
      ),
    );
    const facts = sessionFacts({
      parties,
      direction: "lowest",
      remarkable: null,
    });

    expect(textOf(facts, "best-score")).toBe(
      "Plus petit score de la soirée : Anne, 3 points",
    );
  });

  it("names both when two players posted the same best", () => {
    const parties = evening(
      party(
        [
          [ANNE, 142],
          [BOB, 30],
        ],
        [ANNE],
      ),
      party(
        [
          [CLARA, 142],
          [BOB, 30],
        ],
        [CLARA],
      ),
    );
    const facts = sessionFacts({
      parties,
      direction: "highest",
      remarkable: null,
    });

    expect(textOf(facts, "best-score")).toBe(
      "Plus gros score de la soirée : Anne et Clara, 142 points",
    );
  });

  it("calls out a run of three victories", () => {
    const win = party(
      [
        [ANNE, 10],
        [BOB, 4],
      ],
      [ANNE],
    );
    const facts = sessionFacts({
      parties: evening(win, win, win),
      direction: "highest",
      remarkable: null,
    });

    expect(textOf(facts, "win-streak")).toBe(
      "Anne enchaîne 3 victoires d'affilée 🔥",
    );
  });

  it("leaves a run of two alone", () => {
    const win = party(
      [
        [ANNE, 10],
        [BOB, 4],
      ],
      [ANNE],
    );
    const other = party(
      [
        [ANNE, 4],
        [BOB, 10],
      ],
      [BOB],
    );
    const facts = sessionFacts({
      parties: evening(win, win, other, win, win),
      direction: "highest",
      remarkable: null,
    });

    expect(textOf(facts, "win-streak")).toBe("");
  });

  it("teases the player who has been last three deals running", () => {
    const beaten = party(
      [
        [ANNE, 10],
        [BOB, 4],
        [CLARA, 7],
      ],
      [ANNE],
    );
    const facts = sessionFacts({
      parties: evening(beaten, beaten, beaten),
      direction: "highest",
      remarkable: null,
    });

    expect(textOf(facts, "last-streak")).toBe(
      "Bob ferme la marche depuis 3 parties 😬",
    );
  });

  it("breaks a run of last places on a party it cannot rank", () => {
    // The middle deal is missing a score, so nobody came last in it — and the
    // run either side of it is only two deals long.
    const beaten = party(
      [
        [ANNE, 10],
        [BOB, 4],
      ],
      [ANNE],
    );
    const unknown = party(
      [
        [ANNE, 10],
        [BOB, null],
      ],
      [ANNE],
    );
    const facts = sessionFacts({
      parties: evening(beaten, beaten, unknown, beaten, beaten),
      direction: "highest",
      remarkable: null,
    });

    expect(textOf(facts, "last-streak")).toBe("");
  });

  it("says nobody came last when the whole table finished level", () => {
    const level = party(
      [
        [ANNE, 7],
        [BOB, 7],
      ],
      [],
    );
    const facts = sessionFacts({
      parties: evening(level, level, level),
      direction: "highest",
      remarkable: null,
    });

    expect(textOf(facts, "last-streak")).toBe("");
  });

  it("keeps every name's run alive through a shared victory", () => {
    const shared = party(
      [
        [ANNE, 10],
        [BOB, 10],
      ],
      [ANNE, BOB],
    );
    const facts = sessionFacts({
      parties: evening(shared, shared, shared),
      direction: "highest",
      remarkable: null,
    });

    expect(textOf(facts, "win-streak")).toBe(
      "Anne enchaîne 3 victoires d'affilée 🔥",
    );
  });

  it("celebrates a mark cleared party after party", () => {
    const big = party(
      [
        [ANNE, 220],
        [BOB, 40],
      ],
      [ANNE],
    );
    const small = party(
      [
        [ANNE, 30],
        [BOB, 40],
      ],
      [BOB],
    );
    const facts = sessionFacts({
      parties: [big, big, big, small, small],
      direction: "highest",
      remarkable: 200,
    });

    expect(textOf(facts, "threshold")).toBe(
      "Anne passe les 200 points dans 60 % de ses parties, joli !",
    );
  });

  it("reads the mark downwards when the small score wins", () => {
    const low = party(
      [
        [ANNE, 12],
        [BOB, 90],
      ],
      [ANNE],
    );
    const facts = sessionFacts({
      parties: [low, low, low, low, low],
      direction: "lowest",
      remarkable: 15,
    });

    expect(textOf(facts, "threshold")).toBe(
      "Anne reste sous les 15 points dans 100 % de ses parties, joli !",
    );
  });

  it("keeps quiet about a mark cleared once or twice", () => {
    const big = party(
      [
        [ANNE, 220],
        [BOB, 40],
      ],
      [ANNE],
    );
    const small = party(
      [
        [ANNE, 30],
        [BOB, 40],
      ],
      [BOB],
    );
    const facts = sessionFacts({
      parties: [big, big, small, small, small],
      direction: "highest",
      remarkable: 200,
    });

    expect(textOf(facts, "threshold")).toBe("");
  });

  it("keeps quiet when history could name no mark at all", () => {
    const big = party(
      [
        [ANNE, 220],
        [BOB, 40],
      ],
      [ANNE],
    );
    const facts = sessionFacts({
      parties: [big, big, big, big, big],
      direction: "highest",
      remarkable: null,
    });

    expect(textOf(facts, "threshold")).toBe("");
  });

  it("gives the mark to the most regular, ties going alphabetically", () => {
    const both = party(
      [
        [BOB, 220],
        [ANNE, 220],
      ],
      [ANNE],
    );
    const facts = sessionFacts({
      parties: [both, both, both, both, both],
      direction: "highest",
      remarkable: 200,
    });

    expect(textOf(facts, "threshold")).toBe(
      "Anne passe les 200 points dans 100 % de ses parties, joli !",
    );
  });

  it("gives the mark to the steadier of two crossers", () => {
    const anne = party(
      [
        [ANNE, 220],
        [BOB, 40],
      ],
      [ANNE],
    );
    const both = party(
      [
        [ANNE, 220],
        [BOB, 220],
      ],
      [ANNE],
    );
    const facts = sessionFacts({
      parties: [both, both, both, anne, anne],
      direction: "highest",
      remarkable: 200,
    });

    expect(textOf(facts, "threshold")).toBe(
      "Anne passe les 200 points dans 100 % de ses parties, joli !",
    );
  });

  it("has nothing to say about an evening nobody was scored in", () => {
    const unscored = party(
      [
        [ANNE, null],
        [BOB, null],
      ],
      [],
    );
    const facts = sessionFacts({
      parties: [unscored, unscored, unscored, unscored, unscored],
      direction: "highest",
      remarkable: 200,
    });

    expect(facts).toEqual([]);
  });
});

describe("remarkableScore", () => {
  it("has no opinion on a history of a handful of parties", () => {
    expect(remarkableScore([10, 20, 30], "highest")).toBeNull();
  });

  it("reads the upper quartile, rounded up to a figure a table says", () => {
    // 12 scores; the upper quartile lands on 172, which reads as « les 180 ».
    const scores = [80, 90, 100, 110, 120, 130, 140, 150, 172, 182, 200, 240];

    expect(remarkableScore(scores, "highest")).toBe(180);
  });

  it("reads the lower quartile downwards when the small score wins", () => {
    // The lower quartile lands on 22, which reads as « sous les 20 ».
    const scores = [3, 8, 22, 24, 30, 33, 40, 44, 60, 80, 90, 110];

    expect(remarkableScore(scores, "lowest")).toBe(20);
  });

  it("counts in units on a game played for a handful of points", () => {
    const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    expect(remarkableScore(scores, "highest")).toBe(9);
  });

  it("counts in fifties on a game played for hundreds", () => {
    const scores = [
      400, 450, 500, 550, 600, 650, 700, 710, 720, 900, 1000, 1200,
    ];

    expect(remarkableScore(scores, "highest")).toBe(750);
  });

  it("counts in fives between twenty and a hundred", () => {
    const scores = [20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64];

    expect(remarkableScore(scores, "highest")).toBe(55);
  });

  it("refuses a mark rounding put out of everybody's reach", () => {
    // Every score sits between 100 and 104, so rounding the quartile up to the
    // next ten invents a bar nobody has ever cleared.
    const scores = [100, 100, 101, 101, 102, 102, 103, 103, 104, 104];

    expect(remarkableScore(scores, "highest")).toBeNull();
  });

  it("refuses a mark below the lowest score ever posted", () => {
    const scores = [101, 101, 102, 102, 103, 103, 104, 104, 105, 105];

    expect(remarkableScore(scores, "lowest")).toBeNull();
  });
});

describe("comparableScores", () => {
  const CATAN = "bg-catan" as BoardgameId;
  const OTHER = "bg-other" as BoardgameId;

  const scoring = {
    timing: "final",
    entry: "total",
    winCondition: { type: "highest" },
  } as ScoringSpec;

  const history = [
    {
      boardgameId: CATAN,
      players: [{ score: 10 }, { score: 8 }, { score: null }],
    },
    { boardgameId: CATAN, players: [{ score: 12 }, { score: 9 }] },
    { boardgameId: OTHER, players: [{ score: 300 }] },
  ];

  it("keeps this boardgame's scores and drops the empty boxes", () => {
    const scores = comparableScores({
      history,
      boardgameId: CATAN,
      scoring,
      seats: 3,
    });

    expect(scores).toEqual([10, 8, 12, 9]);
  });

  it("still reads a game that crowns no record — the mark is not one", () => {
    // Papayoo, Odin, Catan: no single figure is worth crowning there, which is
    // precisely why the table is told what the game usually costs instead.
    const scores = comparableScores({
      history,
      boardgameId: CATAN,
      scoring: { ...scoring, trackRecords: false },
      seats: 3,
    });

    expect(scores).toEqual([10, 8, 12, 9]);
  });

  it("gives nothing for a game that isn't scored at all", () => {
    const scores = comparableScores({
      history,
      boardgameId: CATAN,
      scoring: null,
      seats: 3,
    });

    expect(scores).toEqual([]);
  });

  it("compares only against tables of the same size when the scale moves", () => {
    const scores = comparableScores({
      history,
      boardgameId: CATAN,
      scoring: { ...scoring, playerCountSensitive: true },
      seats: 2,
    });

    expect(scores).toEqual([12, 9]);
  });
});
