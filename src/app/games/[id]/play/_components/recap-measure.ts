import { formatDuration } from "@/lib/game/format-time";
import type { MeasureKey, RecapMeasure } from "@/lib/game/player-recap";
import { standing } from "@/lib/game/recap-spread";

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

/** « 3ᵉ », « 1ʳᵉ » — feminine, because what is being ranked is a « partie ». */
function ordinal(rank: number): string {
  return rank === 1 ? "1ʳᵉ" : `${rank}ᵉ`;
}

/**
 * Where this party stands, in words — or null when the measure has no good end.
 * A share of the table's time is a fact about a party, so it is shown and never
 * placed; saying « top 75 % » of it would invent a competition.
 *
 * Neither « meilleure » nor a percentage is ever called a record: the marks a
 * party really takes are crowned once, by the banners at the top of this screen.
 * These read against one player's own history, and nobody else's.
 */
export function measureStanding(measure: RecapMeasure): string | null {
  if (measure.rank === null || measure.direction === null) {
    return null;
  }

  if (measure.past.length === 0) {
    return "1ʳᵉ fois";
  }

  const where = standing(
    measure.rank,
    measure.value,
    measure.past,
    measure.direction,
  );

  switch (where.kind) {
    case "best":
      return "sa meilleure";
    case "worst":
      return "sa pire";
    case "rank":
      return `${ordinal(where.rank)} sur ${where.total}`;
    default:
      return `top ${where.percent} %`;
  }
}
