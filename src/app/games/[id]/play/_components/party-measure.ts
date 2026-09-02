import { formatDuration } from "@/lib/game/format-time";
import type { PartyFigureKey } from "@/lib/game/party-figures";

/**
 * What each of the party's figures is called on screen.
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

export function partyLabel(key: PartyFigureKey): string {
  return LABELS[key];
}

/** One figure, written the way its own measure is spoken. */
export function partyValue(key: PartyFigureKey, value: number): string {
  if (key === "rounds") {
    return String(value);
  }

  return formatDuration(Math.round(value));
}
