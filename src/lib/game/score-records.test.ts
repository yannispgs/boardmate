import { describe, expect, it } from "vitest";

import type {
  BoardgameId,
  GameId,
  GameListItem,
  PlayerId,
  ScoringSpec,
} from "@/lib/domain";
import type { FinishedParty, PastParty, ScoreRecord } from "./score-records";
import {
  finishedParties,
  recordHolders,
  recordLabel,
  recordTitle,
  scoreRecords,
  tracksScoreRecord,
  worldRecordOf,
} from "./score-records";

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

/** Splendor's own shape: a race to a target the highest score takes. */
const RACE: ScoringSpec = {
  ...HIGHEST,
  timing: "live",
  stopCondition: { type: "scoreTarget", field: "pointsToWin" },
};

/** A personal best, written the short way the expectations read best in. */
function pb(previous: number, playerCount: number | null = null): ScoreRecord {
  return { kind: "personal", playerCount, previous };
}

/** The game's record, same shorthand. */
function wr(previous: number, playerCount: number | null = null): ScoreRecord {
  return { kind: "world", playerCount, previous };
}

/** A party in the books, written the short way the tests read best in. */
function party(
  id: string,
  scores: Array<[PlayerId, number | null]>,
  boardgameId = GAME,
  setup = "",
): PastParty {
  return {
    gameId: id as GameId,
    boardgameId,
    setup,
    players: scores.map(([playerId, score]) => ({ playerId, score })),
  };
}

/** Who a party crowns when nothing gets in the way: whoever scored best. */
function leaders(
  scoring: ScoringSpec | null,
  standings: Array<[PlayerId, number]>,
): PlayerId[] {
  const totals = standings.map(([, total]) => total);
  const best =
    scoring?.winCondition.type === "lowest"
      ? Math.min(...totals)
      : Math.max(...totals);

  return standings.filter(([, total]) => total === best).map(([id]) => id);
}

/** The records taken, with the defaults every test but its own subject shares. */
function records(
  scoring: ScoringSpec | null,
  standings: Array<[PlayerId, number]>,
  history: PastParty[],
  winners = leaders(scoring, standings),
  setup = "",
) {
  return scoreRecords({
    scoring,
    boardgameId: GAME,
    gameId: NOW,
    setup,
    standings: standings.map(([playerId, total]) => ({ playerId, total })),
    winners,
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

    expect(marks.get(ann)).toEqual([pb(80), wr(90)]);
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

    expect(marks.get(ann)).toEqual([pb(80)]);
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

    expect(marks.get(ann)).toEqual([pb(40), wr(40)]);
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

    expect(marks.get(cat)).toEqual([wr(200)]);
    expect(marks.get(ann)).toEqual([pb(80)]);
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

    expect(marks.get(ann)).toEqual([pb(80), wr(80)]);
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

  it("never reads a score against one made with other extensions", () => {
    const base = [party("g-1", [[ann, 90]])];

    // The same 100 points, read twice. Played with Marins it beats nothing:
    // that board hands out points the base game never had, so the 90 posted
    // without it was never on the same scale.
    expect(records(HIGHEST, [[ann, 100]], base, [ann], "Marins").size).toBe(0);

    expect(records(HIGHEST, [[ann, 100]], base).get(ann)).toEqual([
      pb(90),
      wr(90),
    ]);
  });

  it("compares at equal table size, and says which, when the scale moves", () => {
    const spec = { ...LOWEST, playerCountSensitive: true };
    const marks = scoreRecords({
      scoring: spec,
      boardgameId: GAME,
      gameId: NOW,
      setup: "",
      // Three seats: only the three-player party below counts as history.
      standings: [
        { playerId: ann, total: 60 },
        { playerId: bob, total: 90 },
        { playerId: cat, total: 100 },
      ],
      winners: [ann],
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

    expect(marks.get(ann)).toEqual([pb(70, 3), wr(70, 3)]);
    expect(marks.get(bob)).toBeUndefined();
  });

  it("hands the game's record to the winner alone when several clear it", () => {
    const marks = records(
      HIGHEST,
      [
        [ann, 300],
        [bob, 280],
      ],
      [
        party("g-1", [
          [ann, 100],
          [bob, 150],
        ]),
      ],
    );

    expect(marks.get(ann)).toEqual([pb(100), wr(150)]);
    expect(marks.get(bob)).toEqual([pb(150)]);
  });

  it("holds the game's record back while the tie is unbroken", () => {
    const marks = records(
      HIGHEST,
      [
        [ann, 300],
        [bob, 300],
      ],
      [
        party("g-1", [
          [ann, 100],
          [bob, 100],
        ]),
      ],
      [],
    );

    expect(marks.get(ann)).toEqual([pb(100)]);
    expect(marks.get(bob)).toEqual([pb(100)]);
  });

  it("shares the game's record between the winners of a shared victory", () => {
    const marks = records(
      HIGHEST,
      [
        [ann, 300],
        [bob, 300],
      ],
      [party("g-1", [[cat, 100]])],
      [ann, bob],
    );

    expect(marks.get(ann)).toEqual([wr(100)]);
    expect(marks.get(bob)).toEqual([wr(100)]);
  });

  it("keeps the record to the best seat when the whole table wins", () => {
    const marks = records(
      HIGHEST,
      [
        [ann, 300],
        [bob, 200],
      ],
      [party("g-1", [[cat, 150]])],
      [ann, bob],
    );

    expect(marks.get(ann)).toEqual([wr(150)]);
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

  it("hands out nothing on a race, whose totals all land on the target", () => {
    const marks = records(RACE, [[ann, 18]], [party("g-1", [[ann, 15]])]);

    expect(marks.size).toBe(0);
  });
});

describe("tracksScoreRecord", () => {
  it("crowns a score on a plain scored game, at either end of the scale", () => {
    expect(tracksScoreRecord(HIGHEST)).toBe(true);
    expect(tracksScoreRecord(LOWEST)).toBe(true);
  });

  it("says no on a game that keeps no score at all", () => {
    expect(tracksScoreRecord(null)).toBe(false);
  });

  it("says no where the game declares its scores incomparable", () => {
    expect(tracksScoreRecord({ ...HIGHEST, trackRecords: false })).toBe(false);
  });

  // The point of the whole predicate: Splendor never declared anything, and
  // still must not crown a total — it stops the instant somebody reaches 15.
  it("says no on a race, with nothing declared on the game", () => {
    expect(tracksScoreRecord(RACE)).toBe(false);
  });

  // Odin stops on a target too, but there the small score wins, so crossing the
  // line is what loses you the game — it is not a race, and it keeps its record
  // unless it says otherwise.
  it("still crowns a game that stops on a target the lowest score takes", () => {
    expect(
      tracksScoreRecord({ ...RACE, winCondition: { type: "lowest" } }),
    ).toBe(true);
  });
});

describe("worldRecordOf", () => {
  it("finds the game's record whichever seat wears it", () => {
    const marks = new Map([
      [ann, [pb(10)]],
      [bob, [pb(20), wr(30)]],
    ]);

    expect(worldRecordOf(marks)).toEqual(wr(30));
  });

  it("answers nothing when the party only took personal bests", () => {
    expect(worldRecordOf(new Map([[ann, [pb(10)]]]))).toBeNull();
  });

  it("answers nothing when the party took no record at all", () => {
    expect(worldRecordOf(new Map())).toBeNull();
  });
});

describe("recordHolders", () => {
  const scorings = new Map([[GAME, HIGHEST]]);

  /** A finished party, with whoever posted its best total as its winner. */
  function finished(
    id: string,
    scores: Array<[PlayerId, number | null]>,
    winners?: PlayerId[],
  ): FinishedParty {
    const scored = scores.filter(([, s]) => s !== null) as Array<
      [PlayerId, number]
    >;
    const best = Math.max(...scored.map(([, s]) => s));

    return {
      ...party(id, scores),
      winners:
        winners ?? scored.filter(([, s]) => s === best).map(([who]) => who),
    };
  }

  it("marks the one party nobody has beaten, and only that one", () => {
    const holders = recordHolders(
      [
        finished("g-1", [
          [ann, 90],
          [bob, 40],
        ]),
        finished("g-2", [
          [ann, 112],
          [bob, 60],
        ]),
        finished("g-3", [
          [ann, 98],
          [bob, 70],
        ]),
      ],
      scorings,
    );

    expect(holders.size).toBe(1);
    expect(holders.get("g-2" as GameId)).toEqual(wr(98));
  });

  it("leaves the very first party unmarked — it beat nothing", () => {
    const holders = recordHolders([finished("g-1", [[ann, 90]])], scorings);

    expect(holders.size).toBe(0);
  });

  it("holds one record per table size when the scale moves with the table", () => {
    const holders = recordHolders(
      [
        finished("g-1", [
          [ann, 90],
          [bob, 40],
        ]),
        finished("g-2", [
          [ann, 112],
          [bob, 60],
        ]),
        finished("g-3", [
          [ann, 50],
          [bob, 30],
          [cat, 20],
        ]),
        finished("g-4", [
          [ann, 70],
          [bob, 30],
          [cat, 20],
        ]),
      ],
      new Map([[GAME, { ...HIGHEST, playerCountSensitive: true }]]),
    );

    expect(holders.get("g-2" as GameId)).toEqual(wr(90, 2));
    expect(holders.get("g-4" as GameId)).toEqual(wr(50, 3));
  });

  it("marks no party of a game that keeps no record", () => {
    const holders = recordHolders(
      [finished("g-1", [[ann, 90]]), finished("g-2", [[ann, 112]])],
      new Map([[GAME, { ...HIGHEST, trackRecords: false }]]),
    );

    expect(holders.size).toBe(0);
  });

  it("marks no party of a game the list knows no scoring for", () => {
    const holders = recordHolders(
      [finished("g-1", [[ann, 90]]), finished("g-2", [[ann, 112]])],
      new Map(),
    );

    expect(holders.size).toBe(0);
  });

  it("skips a party a seat was left unscored on", () => {
    const holders = recordHolders(
      [
        finished("g-1", [
          [ann, 90],
          [bob, 40],
        ]),
        finished("g-2", [
          [ann, 112],
          [bob, null],
        ]),
      ],
      scorings,
    );

    expect(holders.size).toBe(0);
  });

  it("gives the record to a shared victory's whole winning group", () => {
    const holders = recordHolders(
      [
        finished("g-1", [
          [ann, 90],
          [bob, 40],
        ]),
        finished("g-2", [
          [ann, 112],
          [bob, 112],
        ]),
      ],
      scorings,
    );

    expect(holders.get("g-2" as GameId)).toEqual(wr(90));
  });
});

describe("finishedParties", () => {
  it("reduces a listed game to its scores and its winners", () => {
    const games = [
      {
        id: "g-1" as GameId,
        boardgameId: GAME,
        // The scenario is dropped on the way in: it splits the races, not the
        // scores — a point scored on one Marins map is a point on any other.
        extensions: [{ name: "Marins", scenarioName: "Les quatre îles" }],
        players: [
          { id: ann, name: "Ann", isWinner: true, score: 90 },
          { id: bob, name: "Bob", isWinner: false, score: 40 },
        ],
      },
    ] as GameListItem[];

    expect(finishedParties(games)).toEqual([
      {
        gameId: "g-1",
        boardgameId: GAME,
        setup: "Marins",
        players: [
          { playerId: ann, score: 90 },
          { playerId: bob, score: 40 },
        ],
        winners: [ann],
      },
    ]);
  });
});

describe("recordLabel", () => {
  it("wears two letters when the record spans every table", () => {
    expect(recordLabel(pb(10))).toBe("PB");
    expect(recordLabel(wr(10))).toBe("WR");
  });

  it("carries the table size when the record is held at one", () => {
    expect(recordLabel(pb(10, 4))).toBe("PB4");
    expect(recordLabel(wr(10, 3))).toBe("WR3");
  });
});

describe("recordTitle", () => {
  it("spells the mark out", () => {
    expect(recordTitle(pb(10))).toBe("Meilleur score personnel");
    expect(recordTitle(wr(10))).toBe("Record du jeu");
  });

  it("names the table it is held at", () => {
    expect(recordTitle(wr(10, 4))).toBe("Record du jeu à 4 joueurs");
  });
});
