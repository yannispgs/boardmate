import { describe, expect, it } from "vitest";

import type { FigureTurn, PartyFigureKey } from "./party-figures";
import { partyFigures, partyMeasures } from "./party-figures";

/** A turn log of `count` turns spread over `rounds` laps, each `durationS` long. */
function log(
  rounds: number,
  perRound: number,
  durationS: number,
  extra: Partial<FigureTurn> = {},
): FigureTurn[] {
  const turns: FigureTurn[] = [];

  for (let round = 1; round <= rounds; round++) {
    for (let seat = 0; seat < perRound; seat++) {
      turns.push({
        round,
        durationS,
        pauseDurationS: 0,
        overtimeS: 0,
        ...extra,
      });
    }
  }

  return turns;
}

function keysOf(measures: ReadonlyArray<{ key: PartyFigureKey }>) {
  return measures.map(m => {
    return m.key;
  });
}

describe("partyFigures", () => {
  it("splits the played time by lap and by turn, which are not the same", () => {
    const figures = partyFigures(log(4, 3, 30));

    expect(figures.playTime).toBe(360);
    expect(figures.rounds).toBe(4);
    expect(figures.turnCount).toBe(12);
    expect(figures.avgRound).toBe(90);
    expect(figures.avgTurn).toBe(30);
  });

  it("sums the pauses and the overruns across the whole table", () => {
    const figures = partyFigures(
      log(2, 2, 10, { pauseDurationS: 7, overtimeS: 3 }),
    );

    expect(figures.pauseTime).toBe(28);
    expect(figures.overtime).toBe(12);
  });

  it("answers zeroes rather than dividing by nothing on an empty log", () => {
    const figures = partyFigures([]);

    expect(figures.avgRound).toBe(0);
    expect(figures.avgTurn).toBe(0);
    expect(figures.rounds).toBe(0);
  });
});

describe("partyMeasures", () => {
  const base = {
    history: [log(4, 3, 20), log(4, 3, 40)],
    roundLimit: null,
    simultaneous: false,
  };

  it("reads a party on its time, its laps and both its averages", () => {
    const measures = partyMeasures({ ...base, tonight: log(4, 3, 30) });

    expect(keysOf(measures)).toEqual([
      "playTime",
      "rounds",
      "avgRound",
      "avgTurn",
    ]);
  });

  it("places each figure among the same figure of the past parties", () => {
    const measures = partyMeasures({ ...base, tonight: log(4, 3, 30) });
    const playTime = measures[0];

    expect(playTime.value).toBe(360);
    expect(playTime.gauge?.fill).toBe(0.5);
  });

  // « Tours 20 » on a Cascadia is the rulebook, not the evening.
  it("drops the lap count on a game that runs to a fixed number of laps", () => {
    const measures = partyMeasures({
      ...base,
      tonight: log(20, 3, 30),
      roundLimit: 20,
    });

    expect(keysOf(measures)).not.toContain("rounds");
  });

  // Even a log that stops short of the limit, which is what a log normally does:
  // it closes on the lap the table was playing when the game ended.
  it("drops it on a party whose log stops short of that limit", () => {
    const measures = partyMeasures({
      ...base,
      tonight: log(11, 3, 30),
      roundLimit: 12,
    });

    expect(keysOf(measures)).not.toContain("rounds");
  });

  it("drops the mean player turn when the table plays each lap at once", () => {
    const measures = partyMeasures({
      ...base,
      tonight: log(4, 3, 30),
      simultaneous: true,
    });

    expect(keysOf(measures)).toContain("avgRound");
    expect(keysOf(measures)).not.toContain("avgTurn");
  });

  it("says nothing about pauses and overruns a party never had", () => {
    const measures = partyMeasures({ ...base, tonight: log(4, 3, 30) });

    expect(keysOf(measures)).not.toContain("pauseTime");
    expect(keysOf(measures)).not.toContain("overtime");
  });

  it("adds them the moment the table paused or ran over", () => {
    const measures = partyMeasures({
      ...base,
      tonight: log(4, 3, 30, { pauseDurationS: 6, overtimeS: 2 }),
    });

    expect(keysOf(measures)).toContain("pauseTime");
    expect(keysOf(measures)).toContain("overtime");
  });

  it("draws no bar at all on a first party of this game", () => {
    const measures = partyMeasures({
      ...base,
      tonight: log(4, 3, 30),
      history: [],
    });

    expect(measures.every(m => m.gauge === null)).toBe(true);
  });
});
