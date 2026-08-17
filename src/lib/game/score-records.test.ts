import { describe, expect, it } from "vitest";

import type { BoardgameId, GameId, PlayerId, ScoringSpec } from "@/lib/domain";
import type { PastParty } from "./score-records";
import { recordLabel, recordTitle, scoreRecords } from "./score-records";

const GAME = "bg-1" as BoardgameId;
const OTHER_GAME = "bg-2" as BoardgameId;
const NOW = "g-now" as GameId;

const ann = "p-ann" as PlayerId;
const bob = "p-bob" as PlayerId;
const cat = "p-cat" as PlayerId;

/** The plainest scored game there is: one total per player, highest wins. */
const HIGHEST: ScoringSpec = {
  timing: "final",
  entry: "total",
  stopCondition: null,
  winCondition: { type: "highest" },
};

const LOWEST: ScoringSpec = { ...HIGHEST, winCondition: { type: "lowest" } };

/** A party in the books, written the short way the tests read best in. */
function party(
  id: string,
  scores: Array<[PlayerId, number | null]>,
  boardgameId = GAME,
): PastParty {
  return {
    gameId: id as GameId,
    boardgameId,
    players: scores.map(([playerId, score]) => ({ playerId, score })),
  };
}

/** The records taken, with the defaults every test but its own subject shares. */
function records(
  scoring: ScoringSpec | null,
  standings: Array<[PlayerId, number]>,
  history: PastParty[],
) {
  return scoreRecords({
    scoring,
    boardgameId: GAME,
    gameId: NOW,
    standings: standings.map(([playerId, total]) => ({ playerId, total })),
    history,
  });
}

describe("scoreRecords", () => {
  it("marks a player who beats his own best, and the one who beats them all", () => {
    const marks = records(
      HIGHEST,
      [
        [ann, 95],
        [bob, 70],
      ],
      [
        party("g-1", [
          [ann, 80],
          [bob, 90],
        ]),
      ],
    );

    expect(marks.get(ann)).toEqual([
      { kind: "personal", playerCount: null },
      { kind: "world", playerCount: null },
    ]);
    expect(marks.get(bob)).toBeUndefined();
  });

  it("keeps a personal best that falls short of the game's record", () => {
    const marks = records(
      HIGHEST,
      [
        [ann, 85],
        [bob, 60],
      ],
      [
        party("g-1", [
          [ann, 80],
          [bob, 120],
        ]),
      ],
    );

    expect(marks.get(ann)).toEqual([{ kind: "personal", playerCount: null }]);
  });

  it("reads the small end of the scale when the lowest score wins", () => {
    const marks = records(
      LOWEST,
      [
        [ann, 12],
        [bob, 200],
      ],
      [
        party("g-1", [
          [ann, 40],
          [bob, 90],
        ]),
      ],
    );

    expect(marks.get(ann)).toEqual([
      { kind: "personal", playerCount: null },
      { kind: "world", playerCount: null },
    ]);
    expect(marks.get(bob)).toBeUndefined();
  });

  it("crowns nobody on a first party — there is nothing to beat", () => {
    const marks = records(
      HIGHEST,
      [
        [ann, 300],
        [bob, 250],
      ],
      [],
    );

    expect(marks.size).toBe(0);
  });

  it("crowns a newcomer's game record but not a personal best he has no past for", () => {
    const marks = records(
      HIGHEST,
      [
        [ann, 150],
        [cat, 400],
      ],
      [
        party("g-1", [
          [ann, 80],
          [bob, 200],
        ]),
      ],
    );

    expect(marks.get(cat)).toEqual([{ kind: "world", playerCount: null }]);
    expect(marks.get(ann)).toEqual([{ kind: "personal", playerCount: null }]);
  });

  it("refuses an equalled score: a record is taken, not matched", () => {
    const marks = records(HIGHEST, [[ann, 80]], [party("g-1", [[ann, 80]])]);

    expect(marks.size).toBe(0);
  });

  it("ignores the parties played on another game", () => {
    const marks = records(
      HIGHEST,
      [[ann, 50]],
      [party("g-1", [[ann, 900]], OTHER_GAME)],
    );

    expect(marks.size).toBe(0);
  });

  it("ignores the party being recorded, already in the books", () => {
    const marks = records(
      HIGHEST,
      [[ann, 95]],
      [party("g-now", [[ann, 95]]), party("g-1", [[ann, 80]])],
    );

    expect(marks.get(ann)).toEqual([
      { kind: "personal", playerCount: null },
      { kind: "world", playerCount: null },
    ]);
  });

  it("skips the seats nobody scored", () => {
    const marks = records(
      HIGHEST,
      [[ann, 10]],
      [
        party("g-1", [
          [ann, null],
          [bob, null],
        ]),
      ],
    );

    expect(marks.size).toBe(0);
  });

  it("compares at equal table size, and says which, when the scale moves", () => {
    const spec = { ...LOWEST, playerCountSensitive: true };
    const marks = scoreRecords({
      scoring: spec,
      boardgameId: GAME,
      gameId: NOW,
      // Three seats: only the three-player party below counts as history.
      standings: [
        { playerId: ann, total: 60 },
        { playerId: bob, total: 90 },
        { playerId: cat, total: 100 },
      ],
      history: [
        party("g-1", [
          [ann, 70],
          [bob, 80],
          [cat, 100],
        ]),
        // Eight seats share the same 250 points, so everyone scores low there —
        // pooled in, it would own the record for good.
        party("g-2", [
          [ann, 20],
          [bob, 30],
          [cat, 30],
          ["p-d" as PlayerId, 30],
          ["p-e" as PlayerId, 30],
          ["p-f" as PlayerId, 30],
          ["p-g" as PlayerId, 40],
          ["p-h" as PlayerId, 40],
        ]),
      ],
    });

    expect(marks.get(ann)).toEqual([
      { kind: "personal", playerCount: 3 },
      { kind: "world", playerCount: 3 },
    ]);
    expect(marks.get(bob)).toBeUndefined();
  });

  it("hands out nothing on a game whose scores aren't worth comparing", () => {
    const marks = records(
      { ...HIGHEST, trackRecords: false },
      [[ann, 999]],
      [party("g-1", [[ann, 10]])],
    );

    expect(marks.size).toBe(0);
  });

  it("hands out nothing on a game that keeps no score at all", () => {
    const marks = records(null, [[ann, 999]], [party("g-1", [[ann, 10]])]);

    expect(marks.size).toBe(0);
  });
});

describe("recordLabel", () => {
  it("wears two letters when the record spans every table", () => {
    expect(recordLabel({ kind: "personal", playerCount: null })).toBe("PB");
    expect(recordLabel({ kind: "world", playerCount: null })).toBe("WR");
  });

  it("carries the table size when the record is held at one", () => {
    expect(recordLabel({ kind: "personal", playerCount: 4 })).toBe("PB4");
    expect(recordLabel({ kind: "world", playerCount: 3 })).toBe("WR3");
  });
});

describe("recordTitle", () => {
  it("spells the mark out", () => {
    expect(recordTitle({ kind: "personal", playerCount: null })).toBe(
      "Meilleur score personnel",
    );
    expect(recordTitle({ kind: "world", playerCount: null })).toBe(
      "Record du jeu",
    );
  });

  it("names the table it is held at", () => {
    expect(recordTitle({ kind: "world", playerCount: 4 })).toBe(
      "Record du jeu à 4 joueurs",
    );
  });
});
