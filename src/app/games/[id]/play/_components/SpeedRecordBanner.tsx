import type { SpeedRecord } from "@/lib/game/speed-records";
import { speedRecordDetail } from "@/lib/game/speed-records";
import { RecordBanner } from "./RecordBanner";

/**
 * « Record de rapidité battu » — the target was reached in fewer laps than
 * anyone had managed at this table size, on this setup, for this target. The
 * three are spelled out because none of them is comparable to the others: the
 * same course, or no comparison at all.
 */
export function SpeedRecordBanner({
  record,
}: Readonly<{ record: SpeedRecord | null }>) {
  if (record === null) {
    return null;
  }

  return (
    <RecordBanner
      icon="⚡"
      title="Record de rapidité"
      detail={`${speedRecordDetail(record)} — ancien record : ${record.previous}`}
    />
  );
}
