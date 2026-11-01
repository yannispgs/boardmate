/**
 * A game played on bets (Luz) recorded after the fact, donne by donne: each
 * player's points and whether they took the safety token. The totals alone
 * need nothing of this — they go through the ordinary score sheet.
 *
 * The winner is read off the donnes exactly as at the table: the highest
 * total, then the most points on the last donne, the table asked only when
 * those are level too.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { PlayerId, StageBet, StageScore } from "@/lib/domain";

import { betEntryError, withHedge } from "./bet";
import type { MancheFinished } from "./ladder-finished";
import { lastStagePoints, stageFinalScores } from "./stage-tally";

/** One donne as typed: each player's points, null until set, and the token. */
export type BetManche = Record<
  string,
  { points: number | null; hedged: boolean }
>;

/** An empty donne: nothing set, nobody hedged. */
export function blankBetManche(playerIds: readonly PlayerId[]): BetManche {
  return Object.fromEntries(
    playerIds.map(id => [id, { points: null, hedged: false }]),
  );
}

/**
 * Donne `stage` with one player's points or token changed, the rest kept. A
 * won bet whose token is flipped stays won, at the other rate.
 */
export function patchBetManche(
  manche: BetManche,
  playerId: PlayerId,
  patch: Partial<BetManche[string]>,
  bet: StageBet,
  stage: number,
): BetManche {
  const line = {
    ...(manche[playerId] ?? { points: null, hedged: false }),
    ...patch,
  };

  return {
    ...manche,
    [playerId]: {
      ...line,
      points:
        patch.hedged === undefined
          ? line.points
          : withHedge(bet, stage, line.points, line.hedged),
    },
  };
}

/** The donnes as the stage scores they are recorded as. */
export function betMancheScores(
  manches: readonly BetManche[],
  playerIds: readonly PlayerId[],
): StageScore[] {
  return manches.flatMap((manche, index) =>
    playerIds.map(playerId => ({
      stage: index + 1,
      playerId,
      points: manche[playerId]?.points ?? 0,
      hedged: manche[playerId]?.hedged ?? false,
    })),
  );
}

/** The first thing wrong with the donnes, said with the donne it is in. */
function betManchesError(
  manches: readonly BetManche[],
  playerIds: readonly PlayerId[],
  bet: StageBet,
  stageLabel: string,
): string | null {
  if (manches.length === 0) {
    return `Ajoutez au moins une ${stageLabel.toLowerCase()}.`;
  }

  for (const [index, manche] of manches.entries()) {
    if (playerIds.some(id => (manche[id]?.points ?? null) === null)) {
      return `${stageLabel} ${index + 1} : il manque les points de certains joueurs.`;
    }

    const error = betEntryError(
      playerIds.map(playerId => ({
        playerId,
        // Every cell is set by now: checked just above.
        points: manche[playerId]?.points as number,
        hedged: manche[playerId]?.hedged,
      })),
      bet,
      index + 1,
      stageLabel,
    );

    if (error !== null) {
      return error;
    }
  }

  return null;
}

/** Reads the donnes into what the night can be recorded as. */
export function betFinished(
  playerIds: readonly PlayerId[],
  manches: readonly BetManche[],
  bet: StageBet,
  stageLabel: string,
): MancheFinished {
  const stageScores = betMancheScores(manches, playerIds);
  const error = betManchesError(manches, playerIds, bet, stageLabel);

  if (error !== null) {
    return {
      error,
      scoreOf: () => null,
      candidates: [],
      asked: false,
      preselected: [],
      tied: false,
      stageScores,
    };
  }

  const totals = new Map(
    stageFinalScores(playerIds, stageScores).map(s => [s.playerId, s.score]),
  );
  /* c8 ignore next -- `?? 0` guards a seat `stageFinalScores` always fills */
  const totalOf = (id: PlayerId) => totals.get(id) ?? 0;
  const best = Math.max(...playerIds.map(totalOf));
  const leaders = playerIds.filter(id => totalOf(id) === best);
  // Level on the total: the last donne decides, as the rules say.
  const last = lastStagePoints(stageScores);
  /* c8 ignore next -- `?? 0` guards a cell the error check above made sure of */
  const lastOf = (id: PlayerId) => last[id] ?? 0;
  const lastBest = Math.max(...leaders.map(lastOf));
  const contenders = leaders.filter(id => lastOf(id) === lastBest);
  const settled = contenders.length === 1;

  return {
    error: null,
    scoreOf: id => totals.get(id) ?? null,
    candidates: contenders,
    asked: !settled,
    preselected: settled ? contenders : [],
    tied: !settled,
    stageScores,
  };
}
