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
  | "rounds"
  | "avgRound"
  | "avgTurn"
  | "pauseTime"
  | "overtime";

/** Every figure of one party, whether or not it ends up on screen. */
export interface PartyFigures {
  /** Seconds actually played, pauses excluded. */
  playTime: number;
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
 * A party reduced to its figures. Takes a bare turn log so tonight and a party
 * pulled from the history — which are two different shapes everywhere else —
 * can be measured by the same code, and therefore compared at all.
 *
 * ⚠️ The pause **count** is deliberately absent: the recorded history carries
 * the paused seconds but not how many pauses made them up, so a party of the
 * past could not answer. The seconds say the same thing in the unit that
 * matters.
 */
export function partyFigures(turns: readonly FigureTurn[]): PartyFigures {
  const playTime = turns.reduce((sum, t) => {
    return sum + t.durationS;
  }, 0);
  const rounds = turns.reduce((max, t) => {
    return Math.max(max, t.round);
  }, 0);

  return {
    playTime,
    rounds,
    turnCount: turns.length,
    avgRound: rounds > 0 ? playTime / rounds : 0,
    avgTurn: turns.length > 0 ? playTime / turns.length : 0,
    pauseTime: turns.reduce((sum, t) => {
      return sum + t.pauseDurationS;
    }, 0),
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
  tonight: readonly FigureTurn[];
  /**
   * The parties tonight is read against — already narrowed to the same game at
   * the same table size, and with tonight left out. A party is not a reference
   * for itself.
   */
  history: ReadonlyArray<readonly FigureTurn[]>;
  /**
   * The rulebook's fixed number of laps, when the game has one — Cascadia's 20,
   * Smallworld's 9. Used to drop a count that only repeats the rules.
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
 * - **the lap count, once the party reached the game's fixed limit.** « Tours 20 »
 *   on a Cascadia is the rulebook, not the evening. It comes back the moment the
 *   party stopped short of the limit, where it becomes the only thing on the
 *   screen saying the game was abandoned.
 * - **the mean player turn on a simultaneous game.** Everyone plays the lap at
 *   once, so dividing the table's time by the number of turns would answer a
 *   question nobody asked.
 *
 * A pause total and an overtime total that are zero are dropped too — the party
 * never paused and never ran over, and a tile saying « 0 » twice is two tiles
 * spent on nothing.
 */
export function partyMeasures({
  tonight,
  history,
  roundLimit,
  simultaneous,
}: PartyMeasuresInput): PartyMeasure[] {
  const figures = partyFigures(tonight);
  const past = history.map(partyFigures);

  const keys: PartyFigureKey[] = ["playTime"];

  if (roundLimit === null || figures.rounds < roundLimit) {
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
