import { describe, expect, it } from "vitest";

import type {
  BoardgameId,
  GameId,
  GameStatsRecord,
  PlayedExtension,
  PlayerId,
  ScoringSpec,
} from "@/lib/domain";
import type { RunCandidate, SpeedRun } from "./speed-records";
import {
  sameCourse,
  setupKey,
  speedRecord,
  speedRecordDetail,
  speedRunOf,
  speedRuns,
  tracksSpeedRecord,
} from "./speed-records";

const GAME = "bg-1" as BoardgameId;
const OTHER_GAME = "bg-2" as BoardgameId;

const ann = "p-ann" as PlayerId;
const bob = "p-bob" as PlayerId;

/** Catan: the game stops when someone reaches the target, biggest total wins. */
const RACE: ScoringSpec = {
  timing: "live",
  entry: "total",
  stopCondition: { type: "scoreTarget", field: "targetScore" },
  winCondition: { type: "highest" },
};

/** Odin: same finish line, but crossing it is what loses you the game. */
const REVERSE_RACE: ScoringSpec = {
  ...RACE,
  winCondition: { type: "lowest" },
};

/** Wingspan: nothing to race towards — the game ends after its mancheS. */
const NO_TARGET: ScoringSpec = { ...RACE, stopCondition: null };

/** A party as it stands, with the defaults every test but its own subject shares. */
function candidate(over: Partial<RunCandidate> = {}): RunCandidate {
  return {
    gameId: "g-now" as GameId,
    boardgameId: GAME,
    rounds: 9,
    played: true,
    playerCount: 3,
    target: 10,
    extensions: [],
    winners: [ann],
    ...over,
  };
}

/** A race already in the books, same shorthand. */
function run(over: Partial<SpeedRun> = {}): SpeedRun {
  return {
    gameId: "g-old" as GameId,
    boardgameId: GAME,
    rounds: 12,
    playerCount: 3,
    target: 10,
    setup: "",
    winners: [bob],
    ...over,
  };
}

/** A finished party as `listStats` hands it over. */
function stats(over: Partial<GameStatsRecord> = {}): GameStatsRecord {
  return {
    gameId: "g-old" as GameId,
    boardgameId: GAME,
    boardgameName: "Catan",
    dice: null,
    endedAt: "2026-08-27T20:00:00.000Z",
    rounds: 12,
    winThreshold: 10,
    extensions: [],
    players: [
      { playerId: ann, name: "Ann", seatOrder: 0, isWinner: false, score: 8 },
      { playerId: bob, name: "Bob", seatOrder: 1, isWinner: true, score: 10 },
    ],
    turns: [
      {
        playerId: ann,
        round: 1,
        durationS: 30,
        pauseDurationS: 0,
        overtimeS: 0,
      },
    ],
    diceRolls: [],
    ...over,
  };
}

const marins: PlayedExtension = { name: "Catan - Marins", scenarioName: null };
const heading: PlayedExtension = {
  name: "Catan - Marins",
  scenarioName: "Cap au Nord",
};

describe("tracksSpeedRecord", () => {
  it("times a race towards a target the biggest score takes", () => {
    expect(tracksSpeedRecord(RACE)).toBe(true);
  });

  it("times nothing on a game that aims at no score", () => {
    expect(tracksSpeedRecord(NO_TARGET)).toBe(false);
    expect(tracksSpeedRecord(null)).toBe(false);
  });

  it("times nothing when crossing the line is what loses the game", () => {
    expect(tracksSpeedRecord(REVERSE_RACE)).toBe(false);
  });
});

describe("setupKey", () => {
  it("is empty for the base game — a basket of its own", () => {
    expect(setupKey([])).toBe("");
  });

  it("names the scenario an extension was played on", () => {
    expect(setupKey([heading])).toBe("Catan - Marins/Cap au Nord");
  });

  it("keeps the extensions in play order, joined", () => {
    expect(setupKey([marins, { name: "Villes", scenarioName: null }])).toBe(
      "Catan - Marins + Villes",
    );
  });
});

describe("speedRunOf", () => {
  it("reads a played party as a race", () => {
    expect(speedRunOf(RACE, candidate({ extensions: [heading] }))).toEqual({
      gameId: "g-now",
      boardgameId: GAME,
      rounds: 9,
      playerCount: 3,
      target: 10,
      setup: "Catan - Marins/Cap au Nord",
      winners: [ann],
    });
  });

  it("refuses a game that keeps no speed record", () => {
    expect(speedRunOf(NO_TARGET, candidate())).toBeNull();
  });

  it("refuses a party keyed in after the fact — its laps were never played", () => {
    expect(speedRunOf(RACE, candidate({ played: false }))).toBeNull();
  });

  it("refuses a party whose finish line is unknown", () => {
    expect(speedRunOf(RACE, candidate({ target: null }))).toBeNull();
  });

  it("refuses a party nobody won — the mark has no holder", () => {
    expect(speedRunOf(RACE, candidate({ winners: [] }))).toBeNull();
  });
});

describe("speedRuns", () => {
  it("keeps only the races run on this very game", () => {
    const history = [stats(), stats({ boardgameId: OTHER_GAME })];

    expect(speedRuns(RACE, GAME, history)).toEqual([
      {
        gameId: "g-old",
        boardgameId: GAME,
        rounds: 12,
        playerCount: 2,
        target: 10,
        setup: "",
        winners: [bob],
      },
    ]);
  });

  it("drops the parties that are not races", () => {
    expect(speedRuns(RACE, GAME, [stats({ turns: [] })])).toEqual([]);
  });

  it("treats a fixture without laps or line as an unplayed one", () => {
    const bare = stats({ rounds: undefined, winThreshold: undefined });

    expect(speedRuns(RACE, GAME, [bare])).toEqual([]);
  });

  it("reads the extensions a party was played with as its course", () => {
    const played = speedRuns(RACE, GAME, [stats({ extensions: [marins] })]);

    expect(played[0]?.setup).toBe("Catan - Marins");
  });

  it("reads a fixture carrying no extensions as the base game", () => {
    const bare = speedRuns(RACE, GAME, [stats({ extensions: undefined })]);

    expect(bare[0]?.setup).toBe("");
  });
});

describe("sameCourse", () => {
  it("compares two races run on the same game, table, line and setup", () => {
    expect(sameCourse(run(), run({ gameId: "g-2" as GameId }))).toBe(true);
  });

  it("separates two games", () => {
    expect(sameCourse(run(), run({ boardgameId: OTHER_GAME }))).toBe(false);
  });

  it("separates two table sizes", () => {
    expect(sameCourse(run(), run({ playerCount: 4 }))).toBe(false);
  });

  it("separates two finish lines", () => {
    expect(sameCourse(run(), run({ target: 12 }))).toBe(false);
  });

  it("separates two setups", () => {
    expect(sameCourse(run(), run({ setup: "Catan - Marins" }))).toBe(false);
  });
});

describe("speedRecord", () => {
  it("announces the mark a party has just taken", () => {
    const taken = speedRecord(speedRunOf(RACE, candidate()), [run()]);

    expect(taken).toEqual({
      rounds: 9,
      previous: 12,
      playerCount: 3,
      target: 10,
    });
  });

  it("says nothing about a party that is not a race", () => {
    expect(speedRecord(null, [run()])).toBeNull();
  });

  it("crowns nobody on a first race — there is nothing to beat", () => {
    expect(speedRecord(speedRunOf(RACE, candidate()), [])).toBeNull();
  });

  it("ignores the party's own row, read back from the books", () => {
    const same = run({ gameId: "g-now" as GameId, rounds: 9 });

    expect(speedRecord(speedRunOf(RACE, candidate()), [same])).toBeNull();
  });

  it("ignores the races run on another course", () => {
    const elsewhere = run({ playerCount: 4, rounds: 5 });

    expect(speedRecord(speedRunOf(RACE, candidate()), [elsewhere])).toBeNull();
  });

  it("does not hand the mark to a party that only equals it", () => {
    const equal = run({ rounds: 9 });

    expect(speedRecord(speedRunOf(RACE, candidate()), [equal])).toBeNull();
  });

  it("takes the best mark standing as the one to beat", () => {
    const history = [run(), run({ gameId: "g-2" as GameId, rounds: 10 })];
    const taken = speedRecord(speedRunOf(RACE, candidate()), history);

    expect(taken?.previous).toBe(10);
  });
});

describe("speedRecordDetail", () => {
  it("says the mark in full", () => {
    expect(speedRecordDetail({ rounds: 9, playerCount: 3, target: 16 })).toBe(
      "9 tours à 3 joueurs pour 16 points",
    );
  });

  it("keeps the lap singular", () => {
    expect(speedRecordDetail({ rounds: 1, playerCount: 2, target: 10 })).toBe(
      "1 tour à 2 joueurs pour 10 points",
    );
  });
});
