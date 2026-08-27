import type { ScoreRecord } from "@/lib/game/score-records";
import { recordTitle } from "@/lib/game/score-records";
import { RecordBanner } from "./RecordBanner";

/**
 * « Record du jeu battu » — the best total ever posted on this game has just
 * changed hands. Nothing is shown when no record was taken, which is nearly
 * every party.
 */
export function ScoreRecordBanner({
  record,
  score,
}: Readonly<{ record: ScoreRecord | null; score: number | null }>) {
  if (record === null || score === null) {
    return null;
  }

  return (
    <RecordBanner
      icon="⭐"
      title={recordTitle(record)}
      detail={`${score} pts — ancien record : ${record.previous}`}
    />
  );
}
