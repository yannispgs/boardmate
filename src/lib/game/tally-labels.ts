/**
 * What a manche closed at zero is called, in the words of the game that closed
 * it.
 *
 * The figure behind it is the same everywhere — {@link TallyExitStat} counts the
 * manches a player took no point on — but what it *means* is not. At Odin a zero
 * is a **sortie**: the manche ended because that player emptied his hand, and
 * going out is the whole point of the game. At Papayoo nobody goes out; a zero
 * simply means the payoos went elsewhere, and several players can end a manche
 * on one. Calling that a « sortie » would describe a move nobody made.
 *
 * So the wording follows the rule the game actually carries (`singleExit`)
 * rather than being written into the cards that show the figure.
 */

import type { StageSpec } from "@/lib/domain";

export interface TallyExitLabels {
  /** Heading over the ranking. */
  heading: string;
  /** What the percentage measures, read after it (« de sorties »). */
  rate: string;
  /** The event itself, one of them (« sortie »). */
  event: string;
  /** Several of them (« sorties ») — French puts the s in the middle at times. */
  events: string;
  /** Column header where the count sits in a table (« Sorties »). */
  column: string;
  /** What a manche that wasn't one cost, per manche. */
  otherwise: string;
  /** Said of a player it happened to on every single manche. */
  always: string;
}

const EXITS: TallyExitLabels = {
  heading: "Qui sort le plus souvent",
  rate: "de sorties",
  event: "sortie",
  events: "sorties",
  column: "Sorties",
  otherwise: "pts/manche hors sortie",
  always: "Sorti à toutes les manches",
};

const ZEROES: TallyExitLabels = {
  heading: "Qui finit le plus souvent à 0",
  rate: "de manches à 0",
  event: "manche à 0",
  events: "manches à 0",
  column: "Manches à 0",
  otherwise: "pts/manche hors zéro",
  always: "0 point à toutes les manches",
};

/** How this game names a manche somebody took no point on. */
export function tallyExitLabels(spec: StageSpec | null): TallyExitLabels {
  return spec?.singleExit === true ? EXITS : ZEROES;
}
