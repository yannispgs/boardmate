/**
 * A game won by climbing a ladder, one rung per manche at most (Phase 10).
 *
 * Every manche the table writes down two things per player: the points left in
 * his hand, and whether he cleared the rung he was on. The climb decides the
 * game — the first to clear the top rung wins it — and the points only
 * separate players who clear it in the same manche.
 *
 * The variant (`fixedKey`) moves everybody up every manche, cleared or not: the
 * game then lasts exactly as many manches as there are rungs, and the lowest
 * score wins.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type {
  ConfigValues,
  FieldSpec,
  PlayerId,
  StageScore,
  StageSpec,
} from "@/lib/domain";

import { resolveFlag } from "./config-value";

import type { EndOutcome } from "./end-outcome";
import type { PlayerSeries } from "./score-series";
import { type Ranked, rankFinalScores } from "./scoring";
import { type StageEntry, stageEntryError } from "./stage-tally";
import { loneLeader } from "./tie-break";

/**
 * Whether the game runs the variant where everybody climbs every manche — the
 * value chosen at launch, else the config template's default. A game with no
 * ladder, or a ladder with no variant, never does.
 */
export function ladderFixedOn(
  stages: StageSpec | null,
  configValues: ConfigValues | null | undefined,
  templateFields: FieldSpec[],
): boolean {
  const key = stages?.ladder?.fixedKey;

  if (key === undefined) {
    return false;
  }

  return resolveFlag(key, configValues, templateFields, false);
}

/** The manches written down up to `upToStage`, oldest first. */
function stagesUpTo(
  scores: readonly StageScore[],
  upToStage: number,
): number[] {
  return [...new Set(scores.map(s => s.stage))]
    .filter(stage => stage <= upToStage)
    .sort((a, b) => a - b);
}

/**
 * How many rungs each player has cleared once `upToStage` is written down,
 * never more than the ladder has.
 */
export function ladderRungs(
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
  upToStage: number,
  top: number,
  fixed: boolean,
): Record<string, number> {
  const played = stagesUpTo(scores, upToStage).length;

  return Object.fromEntries(
    playerIds.map(id => {
      const cleared = fixed
        ? played
        : scores.filter(
            s =>
              s.playerId === id && s.stage <= upToStage && s.cleared === true,
          ).length;

      return [id, Math.min(cleared, top)];
    }),
  );
}

/**
 * The rung a player is working on, counted from 1 (« Phase 4 ») — the top one
 * once he has cleared everything, since there is nothing above it.
 */
export function workingRung(cleared: number, top: number): number {
  return Math.min(cleared + 1, top);
}

/**
 * Each player's climb after every manche, oldest first: how many rungs he had
 * cleared once that manche was written down. What the progress chart draws.
 */
export function ladderClimb(
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
  top: number,
  fixed: boolean,
): Array<{ stage: number; rungs: Record<string, number> }> {
  return stagesUpTo(scores, Number.POSITIVE_INFINITY).map(stage => ({
    stage,
    rungs: ladderRungs(playerIds, scores, stage, top, fixed),
  }));
}

/**
 * The climb drawn as one step line per player for the end-of-game chart: x is
 * the manche (0 to 1 over the game), y the rungs cleared once it was written
 * down. Every line starts on the ground, before the first manche.
 */
export function ladderSeries(
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
  top: number,
  fixed: boolean,
): PlayerSeries[] {
  const climb = ladderClimb(playerIds, scores, top, fixed);

  return playerIds.map(playerId => ({
    playerId,
    points: [
      { x: 0, score: 0 },
      ...climb.map((manche, index) => ({
        x: (index + 1) / climb.length,
        score: manche.rungs[playerId],
      })),
    ],
  }));
}

/**
 * Whether the game stops once `upToStage` is written down: somebody cleared the
 * top rung — or, in the variant, every rung has had its manche.
 */
export function ladderDone(
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
  upToStage: number,
  top: number,
  fixed: boolean,
): boolean {
  if (fixed) {
    return stagesUpTo(scores, upToStage).length >= top;
  }

  const rungs = ladderRungs(playerIds, scores, upToStage, top, fixed);

  return Object.values(rungs).some(rung => rung >= top);
}

/** One player's line in the standings of a laddered game. */
export interface LadderStanding {
  playerId: PlayerId;
  /** Rungs cleared. */
  rungs: number;
  /** Points taken so far, summed. */
  total: number;
  /** What that manche cost him, `null` when he has no line for it. */
  points: number | null;
  rank: number;
}

/**
 * The standings as of `upToStage`: highest climb first, then fewest points —
 * the order the rulebook reads them in. In the variant everybody stands on the
 * same rung, so it comes down to the points alone.
 */
export function ladderStandings(
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
  upToStage: number,
  top: number,
  fixed: boolean,
): LadderStanding[] {
  const rungs = ladderRungs(playerIds, scores, upToStage, top, fixed);
  const upTo = scores.filter(s => s.stage <= upToStage);
  const lines = playerIds.map(playerId => ({
    playerId,
    rungs: rungs[playerId],
    total: upTo
      .filter(s => s.playerId === playerId)
      .reduce((sum, s) => sum + s.points, 0),
    points:
      scores.find(s => s.playerId === playerId && s.stage === upToStage)
        ?.points ?? null,
  }));

  const sorted = [...lines].sort(
    (a, b) => b.rungs - a.rungs || a.total - b.total,
  );
  const ranked: LadderStanding[] = [];
  let rank = 0;

  for (const [i, line] of sorted.entries()) {
    rank = levelWith(sorted[i - 1], line) ? rank : i + 1;
    ranked.push({ ...line, rank });
  }

  return ranked;
}

/** Whether two lines stand level: the same climb and the same points. */
function levelWith(
  previous: { rungs: number; total: number } | undefined,
  line: { rungs: number; total: number },
): boolean {
  return previous?.rungs === line.rungs && previous.total === line.total;
}

/**
 * Why a manche's entry can't be validated yet, or `null` when it can.
 *
 * Odin's checks hold — exactly one player goes out, nobody negative — and two
 * of Phase 10's own: cards are worth a multiple of the game's `step` (5), so a
 * total off it is a miscount; and nobody goes out without having laid his
 * phase first, so the player on 0 has cleared his rung. The variant moves
 * everybody up regardless, and has no rung to tick.
 */
export function ladderEntryError(
  entries: readonly StageEntry[],
  fixed: boolean,
  step: number,
): string | null {
  const base = stageEntryError(entries, null);

  if (base !== null) {
    return base;
  }

  if (entries.some(e => e.points % step !== 0)) {
    return `Les points d'une manche vont de ${step} en ${step}.`;
  }

  if (!fixed && entries.some(e => e.points === 0 && e.cleared !== true)) {
    return "Celui qui finit la manche a forcément posé sa phase.";
  }

  return null;
}

/**
 * How a laddered game came out. The players who climbed highest contend for it
 * — those who cleared the top rung, on a game played to the end — and the
 * fewest points among them takes it; level on points, nobody is crowned yet and
 * the tie-break opens over them alone (they replay the last phase). In the
 * variant everybody contends, on the points.
 */
export function ladderOutcome(
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
  top: number,
  fixed: boolean,
): EndOutcome & { contenders: PlayerId[] } {
  const standings = ladderStandings(
    playerIds,
    scores,
    Number.POSITIVE_INFINITY,
    top,
    fixed,
  );
  const finals = standings.map(s => ({ playerId: s.playerId, score: s.total }));
  const highest = Math.max(...standings.map(s => s.rungs));
  const contenders = fixed
    ? [...playerIds]
    : standings.filter(s => s.rungs === highest).map(s => s.playerId);
  const field = finals.filter(s => contenders.includes(s.playerId));
  const leader = loneLeader(field, "lowest");

  return {
    scores: finals,
    ranking: fixed
      ? rankFinalScores(finals, "lowest")
      : standings.map(s => ({
          playerId: s.playerId,
          total: s.total,
          rank: s.rank,
        })),
    values: null,
    piles: null,
    winners: leader === null ? [] : [leader],
    contenders,
  };
}

/**
 * The final standings of a finished laddered game, for the score sheet: the
 * recorded winners first — one, or several on a shared victory — then everyone
 * else by how far he climbed, then by his points. A climber level with the
 * winner who lost the replay is 2nd, not a shared 1st.
 */
export function ladderFinalStandings(
  playerIds: readonly PlayerId[],
  winners: readonly PlayerId[],
  scores: readonly StageScore[],
  top: number,
  fixed: boolean,
): Array<Ranked & { rungs: number }> {
  const standings = ladderStandings(
    playerIds,
    scores,
    Number.POSITIVE_INFINITY,
    top,
    fixed,
  );
  const first = standings.filter(s => winners.includes(s.playerId));
  const rest = standings.filter(s => !winners.includes(s.playerId));
  const ranked: Array<Ranked & { rungs: number }> = first.map(s => ({
    playerId: s.playerId,
    total: s.total,
    rank: 1,
    rungs: s.rungs,
  }));

  let rank = 1;

  for (const [i, line] of rest.entries()) {
    rank = levelWith(rest[i - 1], line) ? rank : first.length + i + 1;
    ranked.push({
      playerId: line.playerId,
      total: line.total,
      rank,
      rungs: line.rungs,
    });
  }

  return ranked;
}

/** One player's line of one manche in the detail table. */
export interface LadderCell {
  /** What the manche cost him, null when he has no line for it. */
  points: number | null;
  /** The rung he cleared that manche (« P3 »), null when he cleared none. */
  cleared: number | null;
}

/** One manche of the detail table: everyone's points, and who cleared what. */
export interface LadderRow {
  stage: number;
  cells: Record<string, LadderCell>;
}

/**
 * The manches one by one, for the detail table: what each cost everyone, and
 * the rung each player cleared in it — so « P3 » can sit next to the points of
 * the manche he laid his third phase down. The variant clears nothing: there
 * everybody moves up regardless, and a tag on every cell would say nothing.
 */
export function ladderRows(
  playerIds: readonly PlayerId[],
  scores: readonly StageScore[],
  top: number,
  fixed: boolean,
): LadderRow[] {
  return stagesUpTo(scores, Number.POSITIVE_INFINITY).map(stage => {
    const before = ladderRungs(playerIds, scores, stage - 1, top, false);

    return {
      stage,
      cells: Object.fromEntries(
        playerIds.map(id => {
          const line = scores.find(s => s.stage === stage && s.playerId === id);
          const cleared =
            !fixed && line?.cleared === true && before[id] < top
              ? before[id] + 1
              : null;

          return [id, { points: line?.points ?? null, cleared }];
        }),
      ),
    };
  });
}
