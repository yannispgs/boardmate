/**
 * What each of a party's figures is called on screen, in the words of the game
 * it was played on.
 *
 * Lives here rather than beside the panel because two of the names are no longer
 * constants: a game that turns in generations does not count « tours », and on a
 * game played in phases half the figures describe one phase rather than the
 * evening. Both are read off the boardgame, so a box that calls its stage
 * « Manche » or takes its turns in a phase called « Actions » brings its own
 * wording instead of being special-cased.
 *
 * Pure: no vendor types, unit-tested.
 */

import { formatDuration } from "./format-time";
import type { PartyFigureKey } from "./party-figures";

/** The words one game lends the figures of its own parties. */
export interface PartyNaming {
  /**
   * What the game calls one unit of progress, singular — « Tour » for a game
   * turning in plain laps, « Génération » for Terraforming Mars.
   */
  roundLabel: string;
  /**
   * The phase the turns are taken in, when the game is played in phases —
   * « Projets ». `null` for every game whose stage is one block, and the only
   * thing that tells the two turn averages apart from the party's own time.
   */
  turnPhaseLabel: string | null;
}

/** A game turning in plain laps, which is what almost all of them do. */
export const PLAIN_NAMING: PartyNaming = {
  roundLabel: "Tour",
  turnPhaseLabel: null,
};

/**
 * The fixed half of the names.
 *
 * ⚠️ **« Tour moyen » is one player's turn, here as in the « Les joueurs » tab.**
 * The lap of the table is « Tour de table ». The two used to share the first
 * name across the two halves of this one screen, which made the only pair of
 * figures a reader might confuse the one pair the app called the same thing.
 */
const LABELS: Record<PartyFigureKey, string> = {
  playTime: "Temps de jeu",
  totalTime: "Temps total",
  rounds: "Tours",
  avgRound: "Tour de table",
  avgTurn: "Tour moyen",
  pauseTime: "Temps en pause",
  overtime: "Dépassement",
};

/** The two figures the turn log alone can measure, and therefore the two a
 *  phased game has to qualify: they price the turn-taking phase, not the party. */
const TURN_PHASE_KEYS: readonly PartyFigureKey[] = ["avgRound", "avgTurn"];

export function partyLabel(key: PartyFigureKey, naming: PartyNaming): string {
  // « Tours 14 » on a Terraforming Mars names something nobody at that table
  // would recognise; the count is generations, so the tile says so.
  if (key === "rounds") {
    return `${naming.roundLabel}s`;
  }

  if (naming.turnPhaseLabel !== null && TURN_PHASE_KEYS.includes(key)) {
    return `${LABELS[key]} — ${naming.turnPhaseLabel}`;
  }

  return LABELS[key];
}

/** One figure, written the way its own measure is spoken. */
export function partyValue(key: PartyFigureKey, value: number): string {
  if (key === "rounds") {
    return String(value);
  }

  return formatDuration(Math.round(value));
}
