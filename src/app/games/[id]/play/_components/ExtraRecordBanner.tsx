import type { ExtraRecordTaken } from "@/lib/game/ladder-records";
import { RECORD_SIGIL } from "@/lib/game/record-board";

import { RecordBanner } from "./RecordBanner";

const TITLE: Readonly<Record<ExtraRecordTaken["record"], string>> = {
  heaviestStage: "Record de la manche la plus lourde",
  lowestWin: "Record de la plus petite victoire",
  worstStage: "Record de la plus grosse chute",
  betsWon: "Record de paris réussis",
  betStreak: "Record de la plus longue série",
};

/** What the new mark was, said in full. */
function detail(
  taken: ExtraRecordTaken,
  name: string,
  stageLabel: string,
): string {
  const { value, stage } = taken.mark;
  const was = `ancien record : ${taken.previous}`;

  switch (taken.record) {
    case "heaviestStage":
    case "worstStage":
      return `${name} : ${value} points à la ${stageLabel.toLowerCase()} ${stage} — ${was}`;
    case "betsWon":
      return `${name} réussit ${value} paris — ${was}`;
    case "betStreak":
      return `${name} enchaîne ${value} paris réussis — ${was}`;
    default:
      return `${name} gagne avec ${value} points — ${was}`;
  }
}

/**
 * The game's own records the party has just taken (Phase 10: the heaviest
 * manche, the smallest win; Luz: the worst donne, the bets won), one banner
 * each, under the winner.
 */
export function ExtraRecordBanner({
  taken,
  stageLabel,
  nameOf,
}: Readonly<{
  taken: readonly ExtraRecordTaken[];
  /** What the game calls a manche — « Donne » on Luz. */
  stageLabel: string;
  nameOf: (playerId: ExtraRecordTaken["mark"]["playerId"]) => string;
}>) {
  return (
    <>
      {taken.map(record => (
        <RecordBanner
          key={record.record}
          icon={RECORD_SIGIL[record.record]}
          title={TITLE[record.record]}
          detail={detail(record, nameOf(record.mark.playerId), stageLabel)}
        />
      ))}
    </>
  );
}
