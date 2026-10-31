/**
 * A game scored on bets, manche by manche (Luz).
 *
 * The table writes down only the points of each manche — never the bet nor
 * the tricks — and whether the player hedged with his safety token. The rules
 * leave few figures possible: a won bet pays `win` × the manche's number
 * (`hedgedWin` × it when hedged), a lost one costs `missPerTrick` per trick
 * off. So the points alone say whether the bet was won (above 0) or by how
 * many tricks it was missed, and the entry offers only what can be true.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { PlayerId, StageBet, StageScore } from "@/lib/domain";

/**
 * The points a manche can pay one player, best first: the won bet, then every
 * miss from one trick off to all of them.
 */
export function betValues(
  bet: StageBet,
  stage: number,
  hedged: boolean,
): number[] {
  const win = (hedged ? bet.hedgedWin : bet.win) * stage;

  return [
    win,
    ...Array.from(
      { length: bet.tricks },
      (_v, i) => -(i + 1) * bet.missPerTrick,
    ),
  ];
}

/** Whether a manche's points are a won bet — a lost one never pays. */
export function betWon(points: number): boolean {
  return points > 0;
}

/** How many tricks a lost bet was off by, from what it cost. */
export function tricksOff(bet: StageBet, points: number): number {
  return betWon(points) ? 0 : -points / bet.missPerTrick;
}

/**
 * A manche's points once the hedge is flipped: a won bet stays won, paid at
 * the other rate; a miss costs the same either way; unset stays unset.
 */
export function withHedge(
  bet: StageBet,
  stage: number,
  points: number | null,
  hedged: boolean,
): number | null {
  if (points === null || !betWon(points)) {
    return points;
  }

  return (hedged ? bet.hedgedWin : bet.win) * stage;
}

/** One player's entry for a manche played on bets. */
export interface BetEntry {
  playerId: PlayerId;
  points: number;
  hedged?: boolean;
}

/**
 * Why a manche's entry can't be recorded, or `null` when it can: a figure the
 * rules can't produce for that manche — a won bet paid at the other rate, a
 * miss off the step, nothing at all — is a miscount.
 */
export function betEntryError(
  entries: readonly BetEntry[],
  bet: StageBet,
  stage: number,
  stageLabel: string,
): string | null {
  for (const entry of entries) {
    const hedged = entry.hedged === true;

    if (!betValues(bet, stage, hedged).includes(entry.points)) {
      const win = (hedged ? bet.hedgedWin : bet.win) * stage;

      return `${stageLabel} ${stage} : ${win} pour un pari réussi${
        hedged ? ` avec ${bet.hedgeLabel.toLowerCase()}` : ""
      }, sinon −${bet.missPerTrick} par pli d'écart.`;
    }
  }

  return null;
}

/** Whether the game stops once `upToStage` is written down: its last manche. */
export function betDone(
  scores: readonly StageScore[],
  upToStage: number,
  count: number,
): boolean {
  return (
    new Set(scores.filter(s => s.stage <= upToStage).map(s => s.stage)).size >=
    count
  );
}
