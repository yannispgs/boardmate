import { describe, expect, it } from "vitest";

import type { FigureTurn, PartyFigureKey, PartyLog } from "./party-figures";
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

/** A party as the measures read it: a log, plus what happened outside its turns. */
function party(turns: FigureTurn[], offTurnS = 0): PartyLog {
  return { turns, offTurnS };
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

  it("counts the paused seconds back in to say how long the table sat", () => {
    const figures = partyFigures(log(2, 2, 10, { pauseDurationS: 7 }));

    expect(figures.playTime).toBe(40);
    expect(figures.totalTime).toBe(68);
  });

  // Terraforming Mars: the log only covers « Projets », the table also drafts
  // and produces, and the evening is the lot.
  it("adds the phases the turn log never saw to the party's own time", () => {
    const figures = partyFigures(log(4, 3, 30), 240);

    expect(figures.playTime).toBe(600);
    expect(figures.turnTime).toBe(360);
  });

  // Dividing a whole evening by its turns would price a player's go with the
  // production phase folded into it.
  it("keeps measuring the averages on the turns alone", () => {
    const figures = partyFigures(log(4, 3, 30), 240);

    expect(figures.avgRound).toBe(90);
    expect(figures.avgTurn).toBe(30);
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
    history: [party(log(4, 3, 20)), party(log(4, 3, 40))],
    roundLimit: null,
    simultaneous: false,
  };

  it("reads a party on its time, its laps and both its averages", () => {
    const measures = partyMeasures({ ...base, tonight: party(log(4, 3, 30)) });

    expect(keysOf(measures)).toEqual([
      "playTime",
      "rounds",
      "avgRound",
      "avgTurn",
    ]);
  });

  it("places each figure among the same figure of the past parties", () => {
    const measures = partyMeasures({ ...base, tonight: party(log(4, 3, 30)) });
    const playTime = measures[0];

    expect(playTime.value).toBe(360);
    expect(playTime.gauge?.fill).toBe(0.5);
  });

  // « Tours 20 » on a Cascadia is the rulebook, not the evening.
  it("drops the lap count on a game that runs to a fixed number of laps", () => {
    const measures = partyMeasures({
      ...base,
      tonight: party(log(20, 3, 30)),
      roundLimit: 20,
    });

    expect(keysOf(measures)).not.toContain("rounds");
  });

  // Even a log that stops short of the limit, which is what a log normally does:
  // it closes on the lap the table was playing when the game ended.
  it("drops it on a party whose log stops short of that limit", () => {
    const measures = partyMeasures({
      ...base,
      tonight: party(log(11, 3, 30)),
      roundLimit: 12,
    });

    expect(keysOf(measures)).not.toContain("rounds");
  });

  it("drops the mean player turn when the table plays each lap at once", () => {
    const measures = partyMeasures({
      ...base,
      tonight: party(log(4, 3, 30)),
      simultaneous: true,
    });

    expect(keysOf(measures)).toContain("avgRound");
    expect(keysOf(measures)).not.toContain("avgTurn");
  });

  it("says nothing about pauses and overruns a party never had", () => {
    const measures = partyMeasures({ ...base, tonight: party(log(4, 3, 30)) });

    expect(keysOf(measures)).not.toContain("pauseTime");
    expect(keysOf(measures)).not.toContain("overtime");
  });

  it("adds them the moment the table paused or ran over", () => {
    const measures = partyMeasures({
      ...base,
      tonight: party(log(4, 3, 30, { pauseDurationS: 6, overtimeS: 2 })),
    });

    expect(keysOf(measures)).toContain("pauseTime");
    expect(keysOf(measures)).toContain("overtime");
  });

  // Without a pause the two durations are the same number, and two tiles saying
  // it would have the reader hunt for a difference that cannot be there.
  it("holds back the pause-included time until the table stopped once", () => {
    const measures = partyMeasures({ ...base, tonight: party(log(4, 3, 30)) });

    expect(keysOf(measures)).not.toContain("totalTime");
  });

  it("shows it next to the played time as soon as it stopped", () => {
    const measures = partyMeasures({
      ...base,
      tonight: party(log(4, 3, 30, { pauseDurationS: 5 })),
    });
    const total = measures.find(m => {
      return m.key === "totalTime";
    });

    expect(keysOf(measures).slice(0, 2)).toEqual(["playTime", "totalTime"]);
    expect(total?.value).toBe(420);
  });

  // Both sides carry their off-turn seconds, so a phased game is compared as
  // whole evenings rather than as the third of them the log covers.
  it("counts the off-turn phases on tonight and on the past alike", () => {
    const measures = partyMeasures({
      ...base,
      tonight: party(log(4, 3, 30), 120),
      history: [party(log(4, 3, 20), 60), party(log(4, 3, 40), 180)],
    });
    const playTime = measures[0];

    expect(playTime.value).toBe(480);
    expect(playTime.gauge?.fill).toBe(0.5);
  });

  it("draws no bar at all on a first party of this game", () => {
    const measures = partyMeasures({
      ...base,
      tonight: party(log(4, 3, 30)),
      history: [],
    });

    expect(measures.every(m => m.gauge === null)).toBe(true);
  });
});
