import { formatDuration } from "@/lib/game/format-time";
import type { MeasureKey, RecapMeasure } from "@/lib/game/player-recap";
import type { Standing, Tone } from "@/lib/game/recap-spread";
import { standing, standingTone } from "@/lib/game/recap-spread";

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
      return String(Math.round(value));
    case "avgTurn":
      return formatDuration(Math.round(value));
    default:
      return `${value} tours`;
  }
}

/**
 * A word on what the figure is, for the reader who has never seen it — the
 * three that need one. « Position » is an index, not a score, and it runs
 * **down**; « Rapidité » is only ever read on a victory; « Part du temps » is an
 * index too, and the one measure whose bar carries a shaded zone.
 *
 * The wording of the last one is deliberately the same as the Statistiques
 * page's {@link ../../../../stats/_components/TimeIndexInfo.TimeIndexInfo}: it
 * is the same figure under the same name, and two explanations of one index is
 * how they start drifting apart.
 */
export function measureHint(key: MeasureKey): string | null {
  if (key === "placement") {
    return "0 = premier, 100 = dernier. La barre garde le bon côté à droite, comme les autres.";
  }

  if (key === "speed") {
    return "Tours joués pour atteindre l'objectif, sur tes victoires au même objectif.";
  }

  if (key === "timeShare") {
    return "Indice normalisé par nombre de joueurs : 100 = la part attendue (une répartition égale du temps de la table). En dessous = plus rapide, au-dessus = plus lent. La zone teintée de la barre commence à 100 et rougit jusqu'à 160, le seuil à partir duquel le jeu considère que tu monopolises la table.";
  }

  return null;
}

/** « 3ᵉ », « 1ʳᵉ » — feminine, because what is being ranked is a « partie ». */
function ordinal(rank: number): string {
  return rank === 1 ? "1ʳᵉ" : `${rank}ᵉ`;
}

/** A standing, said and coloured: the two things the reader gets at once. */
export interface MeasureStanding {
  text: string;
  tone: Tone;
}

/** The same sentence, said the way {@link standing} classified it. */
function say(where: Standing): string {
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

/**
 * Where this party stands, in words and in a colour — or null when the measure
 * has no good end. A share of the table's time is a fact about a party, so it is
 * shown and never placed; saying « top 75 % » of it would invent a competition,
 * and painting it green would award a prize for it.
 *
 * Neither « meilleure » nor a percentage is ever called a record: the marks a
 * party really takes are crowned once, by the banners at the top of this screen.
 * These read against one player's own history, and nobody else's.
 */
export function measureStanding(measure: RecapMeasure): MeasureStanding | null {
  if (measure.rank === null || measure.direction === null) {
    return null;
  }

  // A first party is not a good one, whatever the figure: there is nothing
  // behind it for a colour to mean anything against.
  if (measure.past.length === 0) {
    return { text: "1ʳᵉ fois", tone: "neutral" };
  }

  const where = standing(
    measure.rank,
    measure.value,
    measure.past,
    measure.direction,
  );

  return { text: say(where), tone: standingTone(where) };
}
