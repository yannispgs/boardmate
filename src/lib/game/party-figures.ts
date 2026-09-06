/**
 * What a party looks like as a handful of table-level figures, and where each
 * of them falls among the parties played before it.
 *
 * The unit here is the **table**, not the player: this is the « La partie » half
 * of the end-of-game screen, next to the half that reads each player against
 * his own history. Nothing in this file ever names a player.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { Gauge } from "./party-gauge";
import { gauge } from "./party-gauge";

/** The one thing a figure needs off a turn — tonight's or a past party's. */
export interface FigureTurn {
  round: number;
  durationS: number;
  pauseDurationS: number;
  overtimeS: number;
}

/** The figures a party can be read on. */
export type PartyFigureKey =
  | "playTime"
  | "totalTime"
  | "rounds"
  | "avgRound"
  | "avgTurn"
  | "pauseTime"
  | "overtime";

/**
 * A party as the two things it is measured from: its turn log, and the seconds
 * it spent **outside** the phase those turns belong to.
 *
 * On almost every game the second number is zero and a party is its log. On a
 * game played in phases (Terraforming Mars) the log only covers « Projets » —
 * the table also drafts and produces, and those minutes are banked per phase
 * rather than per turn. Reading the evening off the log alone made « Temps de
 * jeu » a third of the truth.
 */
export interface PartyLog {
  turns: readonly FigureTurn[];
  /**
   * Seconds of the phases the turn log never sees. Comes from the phase rows,
   * with the turn phase's own row deliberately left out: that row banks the
   * turns' seconds *and* their pauses, so counting it here would count the
   * evening twice.
   */
  offTurnS: number;
}

/** Every figure of one party, whether or not it ends up on screen. */
export interface PartyFigures {
  /**
   * Seconds the party lasted, pauses excluded — **every phase of it**, not only
   * the one played in turns.
   */
  playTime: number;
  /**
   * Seconds the party occupied the table, **pauses included** — how long the
   * evening lasted rather than how long it was played.
   */
  totalTime: number;
  /**
   * Seconds spent in the phase the turns belong to, which is the only span the
   * log can divide. Equal to `playTime` on a game that declares no phase.
   *
   * ⚠️ Every per-turn average is measured on **this**, never on `playTime`:
   * dividing a whole Terraforming Mars evening by its turns would price a
   * player's go with the production phase folded into it.
   */
  turnTime: number;
  /** Laps of the table reached. */
  rounds: number;
  turnCount: number;
  /** Mean seconds of a full lap of the table. */
  avgRound: number;
  /**
   * Mean seconds of **one player's** turn. On a game where everyone plays at
   * once there is no such thing, and the caller drops it rather than divide the
   * table's time by a number of turns that means something else.
   */
  avgTurn: number;
  pauseTime: number;
  overtime: number;
}

/**
 * A party reduced to its figures. Takes a bare log so tonight and a party pulled
 * from the history — which are two different shapes everywhere else — can be
 * measured by the same code, and therefore compared at all.
 *
 * ⚠️ The pause **count** is deliberately absent: the recorded history carries
 * the paused seconds but not how many pauses made them up, so a party of the
 * past could not answer. The seconds say the same thing in the unit that
 * matters.
 */
export function partyFigures(
  turns: readonly FigureTurn[],
  offTurnS = 0,
): PartyFigures {
  const turnTime = turns.reduce((sum, t) => {
    return sum + t.durationS;
  }, 0);
  const rounds = turns.reduce((max, t) => {
    return Math.max(max, t.round);
  }, 0);
  const pauseTime = turns.reduce((sum, t) => {
    return sum + t.pauseDurationS;
  }, 0);
  const playTime = turnTime + offTurnS;

  return {
    playTime,
    // Summed off the log and the phase rows rather than read as
    // « ended_at - started_at »: that wall answers a different question. A party
    // is opened when the box comes out and closed whenever someone thinks of it,
    // so dev holds parties of ten seconds' play stamped three weeks apart. Play
    // plus pause is the time the table was actually sat down.
    totalTime: playTime + pauseTime,
    turnTime,
    rounds,
    turnCount: turns.length,
    avgRound: rounds > 0 ? turnTime / rounds : 0,
    avgTurn: turns.length > 0 ? turnTime / turns.length : 0,
    pauseTime,
    overtime: turns.reduce((sum, t) => {
      return sum + t.overtimeS;
    }, 0),
  };
}

/** One figure of tonight, and the bar that places it among the parties before. */
export interface PartyMeasure {
  key: PartyFigureKey;
  value: number;
  /** Where it falls among the past parties, or `null` when it cannot be placed. */
  gauge: Gauge | null;
}

export interface PartyMeasuresInput {
  tonight: PartyLog;
  /**
   * The parties tonight is read against — already narrowed to the same game at
   * the same table size, and with tonight left out. A party is not a reference
   * for itself.
   */
  history: readonly PartyLog[];
  /**
   * The rulebook's fixed number of laps, when the game has one — Cascadia's 20,
   * Smallworld's 9. Its presence alone drops a count that only repeats the
   * rules; the value is never compared against the party's own.
   */
  roundLimit: number | null;
  /** Whether the table plays each lap at once, in which case no turn is one player's. */
  simultaneous: boolean;
}

/**
 * The figures worth showing for this party, in reading order, each with its bar.
 *
 * Two figures are dropped rather than shown empty:
 *
 * - **the lap count, on a game that runs to a fixed number of laps.** « Tours 20 »
 *   on a Cascadia is the rulebook, not the evening.
 *
 *   Dropped on the game rather than on the party: a game carrying a `roundLimit`
 *   has no other way of ending — none of the three that do (Cascadia, Smallworld,
 *   Splito) also wins on a threshold or stops mid-lap — so the count is the
 *   rulebook whatever the log says. Showing it back on a party that *looks* short
 *   was worse than useless: the turn log closes on the lap the table was playing
 *   when the game ended, so a Splito played to its twelfth lap records eleven,
 *   and the tile came back on every single one of them reading « Tours 11 ».
 *   The day a game both stops at a limit and can end before it, this wants a flag
 *   of its own rather than a count read off the log.
 * - **the mean player turn on a simultaneous game.** Everyone plays the lap at
 *   once, so dividing the table's time by the number of turns would answer a
 *   question nobody asked.
 *
 * A pause total and an overtime total that are zero are dropped too — the party
 * never paused and never ran over, and a tile saying « 0 » twice is two tiles
 * spent on nothing. The **pause-included time** rides on the same condition,
 * for a stronger reason than tidiness: a party that never stopped played for
 * exactly as long as it lasted, so showing both would print the same duration
 * twice under two names and invite the reader to look for a difference there
 * isn't one.
 */
export function partyMeasures({
  tonight,
  history,
  roundLimit,
  simultaneous,
}: PartyMeasuresInput): PartyMeasure[] {
  const figures = partyFigures(tonight.turns, tonight.offTurnS);
  const past = history.map(p => {
    return partyFigures(p.turns, p.offTurnS);
  });

  const keys: PartyFigureKey[] = ["playTime"];

  if (figures.pauseTime > 0) {
    keys.push("totalTime");
  }

  if (roundLimit === null) {
    keys.push("rounds");
  }

  keys.push("avgRound");

  if (!simultaneous) {
    keys.push("avgTurn");
  }

  if (figures.pauseTime > 0) {
    keys.push("pauseTime");
  }

  if (figures.overtime > 0) {
    keys.push("overtime");
  }

  return keys.map(key => {
    return {
      key,
      value: figures[key],
      gauge: gauge(
        past.map(p => {
          return p[key];
        }),
        figures[key],
      ),
    };
  });
}
