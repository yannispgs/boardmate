import type { ScoreRecord } from "@/lib/game/score-records";
import { RecordBadge } from "./RecordBadge";

/**
 * The records a player took this party, sat to the right of his line. Renders
 * nothing when he took none, which is the ordinary case.
 */
export function RecordBadgeList({
  records,
}: Readonly<{ records: readonly ScoreRecord[] }>) {
  if (records.length === 0) {
    return null;
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      {records.map(record => (
        <RecordBadge key={record.kind} record={record} />
      ))}
    </span>
  );
}
