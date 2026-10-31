import type { ExtraRecordTaken } from "@/lib/game/ladder-records";
import { RECORD_SIGIL } from "@/lib/game/record-board";

import { RecordBanner } from "./RecordBanner";

const TITLE: Readonly<Record<ExtraRecordTaken["record"], string>> = {
  heaviestStage: "Record de la manche la plus lourde",
  lowestWin: "Record de la plus petite victoire",
};

/** What the new mark was, said in full. */
function detail(taken: ExtraRecordTaken, name: string): string {
  const was = `ancien record : ${taken.previous}`;

  if (taken.record === "heaviestStage") {
    return `${name} : ${taken.mark.value} points à la manche ${taken.mark.stage} — ${was}`;
  }

  return `${name} gagne avec ${taken.mark.value} points — ${was}`;
}

/**
 * The game's own records the party has just taken (Phase 10: the heaviest
 * manche, the smallest win), one banner each, under the winner.
 */
export function ExtraRecordBanner({
  taken,
  nameOf,
}: Readonly<{
  taken: readonly ExtraRecordTaken[];
  nameOf: (playerId: ExtraRecordTaken["mark"]["playerId"]) => string;
}>) {
  return (
    <>
      {taken.map(record => (
        <RecordBanner
          key={record.record}
          icon={RECORD_SIGIL[record.record]}
          title={TITLE[record.record]}
          detail={detail(record, nameOf(record.mark.playerId))}
        />
      ))}
    </>
  );
}
