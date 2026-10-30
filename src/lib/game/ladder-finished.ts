/**
 * A laddered game (Phase 10) recorded after the fact, the way the table
 * remembers it: either the final totals alone, or the manches one by one with
 * who laid his phase down in each.
 *
 * The totals alone cannot say who won — the climb decides, and they hold none
 * of it — so the table names the winner. The manches carry the climb, so the
 * winner is read off them exactly as at the table: the highest climb, then the
 * fewest points, the table asked only when those are level.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { PlayerId, StageScore } from "@/lib/domain";

import { ladderEntryError, ladderOutcome } from "./ladder";

/** What was kept of the night: the totals, or the manches. */
export type LadderMode = "total" | "detail";

/** One manche as typed: each player's points, and whether he laid his phase. */
export type LadderManche = Record<string, { points: number; cleared: boolean }>;

/** An empty manche: nobody has any point and nobody has cleared anything. */
export function blankManche(playerIds: readonly PlayerId[]): LadderManche {
  return Object.fromEntries(
    playerIds.map(id => [id, { points: 0, cleared: false }]),
  );
}

/** A manche with one player's points or tick changed, the rest kept. */
export function patchManche(
  manche: LadderManche,
  playerId: PlayerId,
  patch: Partial<LadderManche[string]>,
): LadderManche {
  return {
    ...manche,
    [playerId]: {
      ...(manche[playerId] ?? { points: 0, cleared: false }),
      ...patch,
    },
  };
}

/** The manches as the stage scores they are recorded as. */
export function mancheScores(
  manches: readonly LadderManche[],
  playerIds: readonly PlayerId[],
): StageScore[] {
  return manches.flatMap((manche, index) =>
    playerIds.map(playerId => ({
      stage: index + 1,
      playerId,
      points: manche[playerId]?.points ?? 0,
      cleared: manche[playerId]?.cleared ?? false,
    })),
  );
}

/** What the form still lacks, and who it carries as the winner. */
export interface LadderFinished {
  /** Why the entry can't be recorded yet, or null. */
  error: string | null;
  /** Each player's total, null while it is still missing. */
  scoreOf: (id: PlayerId) => number | null;
  /** The players the win is between. */
  candidates: PlayerId[];
  /** Whether the table has to name the winner. */
  asked: boolean;
  /** Who is carried as the winner while nobody has been named. */
  preselected: PlayerId[];
  /** Whether those asked about are level, rather than simply unknown. */
  tied: boolean;
  /** The manches to record, empty when only the totals were kept. */
  stageScores: StageScore[];
}

/** Reads the form into what the night can be recorded as. */
export function ladderFinished(
  mode: LadderMode,
  playerIds: readonly PlayerId[],
  totals: Readonly<Record<string, string>>,
  manches: readonly LadderManche[],
  top: number,
  step: number,
): LadderFinished {
  if (mode === "total") {
    const scoreOf = (id: PlayerId) => {
      const n = Number.parseInt(totals[id] ?? "", 10);

      return Number.isFinite(n) ? n : null;
    };
    const missing = playerIds.some(id => scoreOf(id) === null);

    return {
      error: missing ? "Il manque le score de certains joueurs." : null,
      scoreOf,
      candidates: [...playerIds],
      asked: true,
      preselected: [],
      tied: false,
      stageScores: [],
    };
  }

  const error = manchesError(manches, playerIds, step);
  const stageScores = mancheScores(manches, playerIds);

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

  const outcome = ladderOutcome(playerIds, stageScores, top, false);
  const totalOf = new Map(outcome.scores.map(s => [s.playerId, s.score]));
  const candidates = outcome.contenders;
  const settled = outcome.winners.length === 1;

  return {
    error: null,
    scoreOf: id => totalOf.get(id) ?? null,
    candidates,
    asked: !settled,
    preselected: outcome.winners,
    tied: !settled,
    stageScores,
  };
}

/** The first thing wrong with the manches, said with the manche it is in. */
function manchesError(
  manches: readonly LadderManche[],
  playerIds: readonly PlayerId[],
  step: number,
): string | null {
  if (manches.length === 0) {
    return "Ajoutez au moins une manche.";
  }

  for (const [index, manche] of manches.entries()) {
    const error = ladderEntryError(
      playerIds.map(playerId => ({
        playerId,
        points: manche[playerId]?.points ?? 0,
        cleared: manche[playerId]?.cleared ?? false,
      })),
      false,
      step,
    );

    if (error !== null) {
      return `Manche ${index + 1} : ${error}`;
    }
  }

  return null;
}
