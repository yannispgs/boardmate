import { describe, expect, it } from "vitest";

import type { BoardgameId, GameId, PlayerId, ScoringSpec } from "@/lib/domain";
import {
  canCompareByTable,
  hasComparablePast,
  MIN_SAME_TABLE_PARTIES,
  playerRecaps,
  type RecapParty,
  type RecapSetup,
} from "./player-recap";

const ann = "ann" as PlayerId;
const bob = "bob" as PlayerId;
const cat = "cat" as PlayerId;

const bg = "bg" as BoardgameId;
const other = "other" as BoardgameId;

const names = new Map<PlayerId, string>([
  [ann, "Ann"],
  [bob, "Bob"],
  [cat, "Cat"],
]);

/** A party, written the short way the expectations read best in. */
function party(
  id: string,
  seats: Array<[PlayerId, number | null, boolean?]>,
  extra: Partial<RecapParty> = {},
): RecapParty {
  return {
    gameId: id as GameId,
    boardgameId: bg,
    winThreshold: null,
    rounds: 0,
    players: seats.map(([playerId, score, isWinner]) => ({
      playerId,
      score,
      isWinner: isWinner === true,
    })),
    turns: [],
    ...extra,
  };
}

const highest: ScoringSpec = {
  timing: "final",
  entry: "total",
  winCondition: { type: "highest" },
};

const lowest: ScoringSpec = {
  timing: "final",
  entry: "total",
  winCondition: { type: "lowest" },
};

/** Catan's shape: the game stops when somebody reaches the target. */
const race: ScoringSpec = {
  timing: "live",
  entry: "total",
  stopCondition: { type: "scoreTarget", field: "pointsToWin" },
  winCondition: { type: "highest" },
};

const scored: RecapSetup = { scoring: highest, timed: false };
const unscored: RecapSetup = { scoring: null, timed: false };

/** The measures of one player, keyed by name — how every test reads a result. */
function measures(recaps: ReturnType<typeof playerRecaps>, id: PlayerId) {
  const recap = recaps.find(r => r.playerId === id);

  return new Map(recap?.measures.map(m => [m.key, m]));
}

describe("playerRecaps", () => {
  it("gives one recap per seat of tonight, the winner first", () => {
    // Bob sat first and finished second: the order the sheet was filled in is
    // not the order the evening is told in.
    const tonight = party("t", [
      [bob, 30],
      [ann, 50, true],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: scored,
      scope: "all",
    });

    expect(recaps.map(r => r.playerId)).toEqual([ann, bob]);
    expect(recaps.map(r => r.name)).toEqual(["Ann", "Bob"]);
    expect(recaps.map(r => r.place)).toEqual([1, 2]);
  });

  it("gives two players level for the lead the same place", () => {
    // Ties share the place of the player above, so nobody is second and the
    // next one down is third — the arithmetic the score sheet already prints.
    const tonight = party("t", [
      [cat, 20],
      [bob, 50, true],
      [ann, 50, true],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: scored,
      scope: "all",
    });

    expect(recaps.map(r => r.place)).toEqual([1, 1, 3]);
    expect(recaps.map(r => r.playerId)).toEqual([bob, ann, cat]);
  });

  it("puts the player a tie-break crowned ahead of the one he beat", () => {
    // Splito's rule settled this table: two players level on 50, one of them
    // recorded the winner. Reading the totals alone would call them both first
    // and contradict the name the score sheet has just crowned.
    const tonight = party("t", [
      [cat, 20],
      [bob, 50],
      [ann, 50, true],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: scored,
      scope: "all",
    });

    expect(recaps.map(r => r.playerId)).toEqual([ann, bob, cat]);
    expect(recaps.map(r => r.place)).toEqual([1, 2, 3]);

    // And the « Position » figure on the same row agrees: the crowned player is
    // the 0, not both of them.
    expect(measures(recaps, ann).get("placement")?.value).toBe(0);
    expect(measures(recaps, bob).get("placement")?.value).toBe(50);
  });

  it("keeps the seating order when the party ranks nobody", () => {
    // A cooperative game has no places to sort on, and inventing one would put
    // a table that won together in an order it never played in.
    const tonight = party("t", [
      [bob, null],
      [ann, null],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: unscored,
      scope: "all",
    });

    expect(recaps.map(r => r.playerId)).toEqual([bob, ann]);
    expect(recaps.map(r => r.place)).toEqual([null, null]);
  });

  it("ranks nobody when tonight's sheet is left half filled", () => {
    const tonight = party("t", [
      [bob, 30],
      [ann, null],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: scored,
      scope: "all",
    });

    expect(recaps.map(r => r.playerId)).toEqual([bob, ann]);
    expect(recaps.map(r => r.place)).toEqual([null, null]);
  });

  it("puts the smallest total first on a game the smallest total wins", () => {
    const tonight = party("t", [
      [bob, 30],
      [ann, 50],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: { scoring: lowest, timed: false },
      scope: "all",
    });

    expect(recaps.map(r => r.playerId)).toEqual([bob, ann]);
    expect(recaps.map(r => r.place)).toEqual([1, 2]);
  });

  it("falls back to an empty name for a player it was given none for", () => {
    const tonight = party("t", [[ann, 50, true]]);
    const [recap] = playerRecaps({
      tonight,
      history: [],
      names: new Map(),
      setup: scored,
      scope: "all",
    });

    expect(recap.name).toBe("");
  });

  it("counts no past party on a first evening", () => {
    const tonight = party("t", [[ann, 50, true]]);
    const [recap] = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: scored,
      scope: "all",
    });

    expect(recap.parties).toBe(0);
    expect(measures(recap ? [recap] : [], ann).get("score")?.past).toEqual([]);
  });

  it("places tonight's score among his own past scores", () => {
    const tonight = party("t", [[ann, 50, true]]);
    const recaps = playerRecaps({
      tonight,
      history: [
        tonight,
        party("p1", [[ann, 40]]),
        party("p2", [[ann, 60]]),
        party("p3", [[ann, 30]]),
      ],
      names,
      setup: scored,
      scope: "all",
    });
    const score = measures(recaps, ann).get("score");

    expect(recaps[0].parties).toBe(3);
    expect(score?.value).toBe(50);
    expect(score?.past.toSorted((a, b) => a - b)).toEqual([30, 40, 60]);
    // One evening beat it, so tonight comes second of the four.
    expect(score?.rank).toBe(2);
    expect(score?.direction).toBe("highest");
  });

  it("turns the ranking over on a game the smallest total wins", () => {
    const tonight = party("t", [[ann, 50, true]]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight, party("p1", [[ann, 40]]), party("p2", [[ann, 60]])],
      names,
      setup: { scoring: lowest, timed: false },
      scope: "all",
    });
    const score = measures(recaps, ann).get("score");

    expect(score?.rank).toBe(2);
    expect(score?.direction).toBe("lowest");
  });

  it("ignores the parties of another boardgame, and tonight's own", () => {
    const tonight = party("t", [[ann, 50, true]]);
    const recaps = playerRecaps({
      tonight,
      history: [
        tonight,
        party("p1", [[ann, 40]], { boardgameId: other }),
        party("p2", [[ann, 20]]),
      ],
      names,
      setup: scored,
      scope: "all",
    });

    expect(recaps[0].parties).toBe(1);
    expect(measures(recaps, ann).get("score")?.past).toEqual([20]);
  });

  it("drops an evening the player was not at, and does not count it", () => {
    const tonight = party("t", [[ann, 50, true]]);
    const recaps = playerRecaps({
      tonight,
      history: [
        tonight,
        party("p1", [[bob, 40, true]]),
        party("p2", [[ann, 20]]),
      ],
      names,
      setup: scored,
      scope: "all",
    });

    expect(recaps[0].parties).toBe(1);
    expect(measures(recaps, ann).get("score")?.past).toEqual([20]);
  });

  it("drops a past evening whose sheet was left unfilled for him", () => {
    const tonight = party("t", [[ann, 50, true]]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight, party("p1", [[ann, null]]), party("p2", [[ann, 20]])],
      names,
      setup: scored,
      scope: "all",
    });

    // He sat at both, so both count — only the figure is missing.
    expect(recaps[0].parties).toBe(2);
    expect(measures(recaps, ann).get("score")?.past).toEqual([20]);
  });

  it("carries no score measure at all when tonight left his own blank", () => {
    const tonight = party("t", [
      [ann, null],
      [bob, 50, true],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight, party("p1", [[ann, 20]])],
      names,
      setup: scored,
      scope: "all",
    });

    expect(measures(recaps, ann).has("score")).toBe(false);
  });

  it("reads a placement on the downward 0–100 scale", () => {
    const tonight = party("t", [
      [ann, 50, true],
      [bob, 30],
      [cat, 10],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: scored,
      scope: "all",
    });
    const placements = measures(recaps, ann).get("placement");

    expect(placements?.value).toBe(0);
    expect(placements?.direction).toBe("lowest");
    expect(measures(recaps, bob).get("placement")?.value).toBe(50);
    expect(measures(recaps, cat).get("placement")?.value).toBe(100);
  });

  it("ranks a placement nobody could better first, ties included", () => {
    const tonight = party("t", [
      [ann, 50, true],
      [bob, 50, true],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [
        tonight,
        party("p1", [
          [ann, 10],
          [bob, 40, true],
        ]),
      ],
      names,
      setup: scored,
      scope: "all",
    });
    const placement = measures(recaps, ann).get("placement");

    // Tied for the lead tonight, last on the evening before.
    expect(placement?.value).toBe(0);
    expect(placement?.past).toEqual([100]);
    expect(placement?.rank).toBe(1);
  });

  it("ranks nobody on a party whose sheet is half filled", () => {
    const tonight = party("t", [
      [ann, 50, true],
      [bob, 30],
    ]);
    const recaps = playerRecaps({
      tonight,
      history: [
        tonight,
        party("p1", [
          [ann, 10],
          [bob, null],
        ]),
      ],
      names,
      setup: scored,
      scope: "all",
    });

    expect(measures(recaps, ann).get("placement")?.past).toEqual([]);
  });

  it("has no placement to read when the game is not scored at all", () => {
    const tonight = party("t", [[ann, null, true]]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: unscored,
      scope: "all",
    });

    expect(recaps[0].measures).toEqual([]);
  });
});

describe("playerRecaps, on a timed game", () => {
  const timed: RecapSetup = { scoring: highest, timed: true };

  const withTurns = (
    id: string,
    seats: Array<[PlayerId, number | null, boolean?]>,
    turns: Array<[PlayerId, number]>,
  ) => {
    return party(id, seats, {
      turns: turns.map(([playerId, durationS]) => ({ playerId, durationS })),
    });
  };

  it("reads his share of the table's time and his average turn", () => {
    const tonight = withTurns(
      "t",
      [
        [ann, 50, true],
        [bob, 30],
      ],
      [
        [ann, 30],
        [ann, 90],
        [bob, 80],
      ],
    );
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: timed,
      scope: "all",
    });
    const read = measures(recaps, ann);

    expect(read.get("timeShare")?.value).toBe(60);
    expect(read.get("avgTurn")?.value).toBe(60);
  });

  it("calls neither end of a time measure the good one", () => {
    const tonight = withTurns("t", [[ann, 50, true]], [[ann, 30]]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight, withTurns("p1", [[ann, 20]], [[ann, 10]])],
      names,
      setup: timed,
      scope: "all",
    });
    const share = measures(recaps, ann).get("timeShare");

    expect(share?.direction).toBeNull();
    expect(share?.rank).toBeNull();
  });

  it("drops an evening nobody's clock ran on", () => {
    const tonight = withTurns("t", [[ann, 50, true]], [[ann, 30]]);
    const recaps = playerRecaps({
      tonight,
      history: [
        tonight,
        withTurns("p1", [[ann, 20]], []),
        withTurns("p2", [[ann, 20]], [[ann, 0]]),
      ],
      names,
      setup: timed,
      scope: "all",
    });
    const read = measures(recaps, ann);

    // p1 has no turn at all, p2 has one that lasted nothing: the share needs a
    // table total to divide by, the average needs a turn to divide by.
    expect(read.get("timeShare")?.past).toEqual([]);
    expect(read.get("avgTurn")?.past).toEqual([0]);
  });

  it("carries no time measure at all on a game that is not timed", () => {
    const tonight = withTurns("t", [[ann, 50, true]], [[ann, 30]]);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: scored,
      scope: "all",
    });
    const read = measures(recaps, ann);

    expect(read.has("timeShare")).toBe(false);
    expect(read.has("avgTurn")).toBe(false);
  });
});

describe("playerRecaps, on a race", () => {
  const raced: RecapSetup = { scoring: race, timed: false };
  const lap = (
    id: string,
    seats: Array<[PlayerId, number | null, boolean?]>,
    rounds: number,
    winThreshold: number,
  ) => {
    return party(id, seats, { rounds, winThreshold });
  };

  it("counts the laps of a victory against his own past victories", () => {
    const tonight = lap(
      "t",
      [
        [ann, 10, true],
        [bob, 6],
      ],
      12,
      10,
    );
    const recaps = playerRecaps({
      tonight,
      history: [
        tonight,
        lap(
          "p1",
          [
            [ann, 10, true],
            [bob, 4],
          ],
          18,
          10,
        ),
        lap(
          "p2",
          [
            [ann, 10, true],
            [bob, 8],
          ],
          9,
          10,
        ),
      ],
      names,
      setup: raced,
      scope: "all",
    });
    const speed = measures(recaps, ann).get("speed");

    expect(speed?.value).toBe(12);
    expect(speed?.past.toSorted((a, b) => a - b)).toEqual([9, 18]);
    expect(speed?.direction).toBe("lowest");
    expect(speed?.rank).toBe(2);
  });

  it("keeps the races to another finish line off the scale", () => {
    const tonight = lap("t", [[ann, 10, true]], 12, 10);
    const recaps = playerRecaps({
      tonight,
      history: [tonight, lap("p1", [[ann, 15, true]], 20, 15)],
      names,
      setup: raced,
      scope: "all",
    });

    expect(measures(recaps, ann).get("speed")?.past).toEqual([]);
  });

  it("counts no lap for a player who did not cross the line", () => {
    const tonight = lap(
      "t",
      [
        [ann, 10, true],
        [bob, 6],
      ],
      12,
      10,
    );
    const recaps = playerRecaps({
      tonight,
      history: [
        tonight,
        lap(
          "p1",
          [
            [ann, 6],
            [bob, 10, true],
          ],
          15,
          10,
        ),
      ],
      names,
      setup: raced,
      scope: "all",
    });

    // Bob lost tonight, so tonight is no time of his at all.
    expect(measures(recaps, bob).has("speed")).toBe(false);
    // Ann won tonight but not the evening before, which drops out.
    expect(measures(recaps, ann).get("speed")?.past).toEqual([]);
  });

  it("counts no lap on a game that does not race towards a target", () => {
    const tonight = lap("t", [[ann, 10, true]], 12, 10);
    const recaps = playerRecaps({
      tonight,
      history: [tonight],
      names,
      setup: scored,
      scope: "all",
    });

    expect(measures(recaps, ann).has("speed")).toBe(false);
  });
});

describe("playerRecaps, read at the same table size", () => {
  it("keeps only the evenings played at as many players", () => {
    const tonight = party("t", [
      [ann, 50, true],
      [bob, 30],
    ]);
    const history = [
      tonight,
      party("p1", [
        [ann, 40],
        [bob, 10, true],
      ]),
      party("p2", [
        [ann, 20],
        [bob, 10],
        [cat, 60, true],
      ]),
    ];
    const all = playerRecaps({
      tonight,
      history,
      names,
      setup: scored,
      scope: "all",
    });
    const table = playerRecaps({
      tonight,
      history,
      names,
      setup: scored,
      scope: "sameTable",
    });

    expect(all[0].parties).toBe(2);
    expect(measures(all, ann).get("score")?.past.toSorted()).toEqual([20, 40]);

    expect(table[0].parties).toBe(1);
    expect(measures(table, ann).get("score")?.past).toEqual([40]);
  });
});

describe("hasComparablePast", () => {
  const tonight = party("t", [
    [ann, 50, true],
    [bob, 30],
  ]);
  const recapsOn = (history: RecapParty[]) => {
    return playerRecaps({
      tonight,
      history,
      names,
      setup: scored,
      scope: "all",
    });
  };

  it("says no on a first evening, where every figure stands alone", () => {
    expect(hasComparablePast(recapsOn([tonight]))).toBe(false);
  });

  it("says yes as soon as one player has one evening behind him", () => {
    expect(
      hasComparablePast(recapsOn([tonight, party("p1", [[bob, 10]])])),
    ).toBe(true);
  });

  it("says no on a game carrying no measure at all", () => {
    const recaps = playerRecaps({
      tonight,
      history: [tonight, party("p1", [[bob, 10]])],
      names,
      setup: unscored,
      scope: "all",
    });

    expect(hasComparablePast(recaps)).toBe(false);
  });
});

describe("canCompareByTable", () => {
  const sensitive: ScoringSpec = { ...highest, playerCountSensitive: true };
  const tonight = party("t", [
    [ann, 50, true],
    [bob, 30],
  ]);
  const duel = (id: string) => {
    return party(id, [
      [ann, 40],
      [bob, 10, true],
    ]);
  };

  it("stays shut on a game whose scale does not move with the table", () => {
    expect(
      canCompareByTable(tonight, [tonight, duel("p1"), duel("p2")], scored),
    ).toBe(false);
  });

  it("stays shut while nobody has enough evenings at this size", () => {
    const setup: RecapSetup = { scoring: sensitive, timed: false };
    const history = [
      tonight,
      duel("p1"),
      party("p2", [
        [ann, 20],
        [bob, 10],
        [cat, 60, true],
      ]),
    ];

    expect(MIN_SAME_TABLE_PARTIES).toBe(2);
    expect(canCompareByTable(tonight, history, setup)).toBe(false);
  });

  it("opens as soon as one player has enough of them", () => {
    const setup: RecapSetup = { scoring: sensitive, timed: false };

    expect(
      canCompareByTable(tonight, [tonight, duel("p1"), duel("p2")], setup),
    ).toBe(true);
  });

  it("stays shut on a game with no scoring at all", () => {
    expect(canCompareByTable(tonight, [tonight, duel("p1")], unscored)).toBe(
      false,
    );
  });
});
