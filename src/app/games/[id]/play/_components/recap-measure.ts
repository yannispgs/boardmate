import { formatDuration } from "@/lib/game/format-time";
import type { MeasureKey, RecapMeasure } from "@/lib/game/player-recap";

/** What each measure is called on screen, in the order they are read in. */
const LABELS: Record<MeasureKey, string> = {
  score: "Score",
  placement: "Position",
  timeShare: "Part du temps",
  avgTurn: "Tour moyen",
  speed: "Rapidité",
};

export function measureLabel(key: MeasureKey): string {
  return LABELS[key];
}

/** One figure, written the way its own measure is spoken. */
export function measureValue(key: MeasureKey, value: number): string {
  switch (key) {
    case "score":
      return `${Math.round(value)} pts`;
    case "placement":
      return String(Math.round(value));
    case "timeShare":
      return `${Math.round(value)} %`;
    case "avgTurn":
      return formatDuration(Math.round(value));
    default:
      return `${value} tours`;
  }
}

/**
 * A word on what the figure is, for the reader who has never seen it — the two
 * that need one. « Position » is an index, not a score, and it runs **down**;
 * « Rapidité » is only ever read on a victory.
 */
export function measureHint(key: MeasureKey): string | null {
  if (key === "placement") {
    return "0 = premier, 100 = dernier.";
  }

  if (key === "speed") {
    return "Tours joués pour atteindre l'objectif, sur tes victoires au même objectif.";
  }

  return null;
}

/**
 * Where tonight stands, in words — or null when the measure has no good end.
 * A share of the table's time is a fact about an evening, so it is shown and
 * never ranked; saying « 3ᵉ » of it would invent a competition.
 *
 * A first place is written as a plain « 1ᵉʳ sur 4 » and never as a record: ties
 * share a rank here, and the marks a party really takes are crowned once, by
 * the banners at the top of this screen.
 */
export function measureStanding(measure: RecapMeasure): string | null {
  if (measure.rank === null) {
    return null;
  }

  const total = measure.past.length + 1;

  if (total === 1) {
    return "1ʳᵉ fois";
  }

  const ordinal = measure.rank === 1 ? "1ᵉʳ" : `${measure.rank}ᵉ`;

  return `${ordinal} sur ${total}`;
}
