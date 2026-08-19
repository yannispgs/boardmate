/**
 * What the phase clocks add up to, once the party is over.
 *
 * The play screen records one row per phase per stage; this reads them back the
 * two ways they mean something. Stage by stage, because « la découverte prend
 * deux minutes en génération 1 et huit en génération 6 » is the whole reason
 * for timing them separately — a single total per phase would hide exactly the
 * thing worth seeing. And phase by phase over the party, because that is the
 * answer to « où passe la soirée ? ».
 *
 * ⚠️ A phase's seconds are the **table's**, never a player's: a simultaneous
 * phase belongs to everybody at once. The only phase one player owns a share of
 * is the sequential one, and its turns are already timed one by one — which is
 * why the per-player figure here comes from the turn log, not from these rows.
 *
 * Pure: no vendor types, unit-tested.
 */

import type {
  BoardgameId,
  GameStatsRecord,
  PhaseSpec,
  PhaseTime,
  PlayerId,
} from "@/lib/domain";

/** One phase's slice of one stage. */
export interface PhaseSlice {
  key: string;
  label: string;
  durationS: number;
  /** 0–1 of the stage's own total, for a stacked bar. */
  share: number;
}

/** One stage, laid out as the phases it was played in. */
export interface StageBreakdown {
  /** The generation / manche, 1-based, as the table counted it. */
  stage: number;
  /** In the boardgame's declared order; a phase never closed is absent. */
  slices: PhaseSlice[];
  totalS: number;
}

/** One phase read over a whole party, or over a whole history of parties. */
export interface PhaseTotal {
  key: string;
  label: string;
  totalS: number;
  /** How many stages recorded it — what `averageS` divides by. */
  stages: number;
  /** Seconds it costs on an average stage. */
  averageS: number;
  /** Seconds it costs on an average party (see the `games` argument). */
  perGameS: number;
  /** 0–1 of all the time spent in phases, for a single share bar. */
  share: number;
}

/** Sums the phase rows of one key, in the order the boardgame declares them. */
function sumByPhase(
  times: PhaseTime[],
  phases: PhaseSpec[],
): Array<{ phase: PhaseSpec; totalS: number; stages: number }> {
  return phases
    .map(phase => {
      const rows = times.filter(t => t.phaseKey === phase.key);

      return {
        phase,
        totalS: rows.reduce((sum, t) => sum + t.durationS, 0),
        stages: rows.length,
      };
    })
    .filter(entry => entry.stages > 0);
}

/**
 * The party broken down stage by stage, oldest first.
 *
 * A stage that recorded nothing is left out rather than drawn as an empty bar:
 * it means the generation is still being played, not that it took no time.
 */
export function stageBreakdowns(
  times: PhaseTime[],
  phases: PhaseSpec[] | null,
): StageBreakdown[] {
  if (!phases || phases.length === 0) {
    return [];
  }

  const stages = [...new Set(times.map(t => t.stage))].sort((a, b) => a - b);

  return stages
    .map(stage => {
      const rows = times.filter(t => t.stage === stage);
      const totalS = rows.reduce((sum, t) => sum + t.durationS, 0);

      return {
        stage,
        totalS,
        slices: sumByPhase(rows, phases).map(entry => ({
          key: entry.phase.key,
          label: entry.phase.label,
          durationS: entry.totalS,
          // A stage of nothing but instant phases would divide by zero; it then
          // has no share to give, which is the truth rather than a NaN.
          share: totalS > 0 ? entry.totalS / totalS : 0,
        })),
      };
    })
    .filter(breakdown => breakdown.slices.length > 0);
}

/**
 * Each phase totalled over everything given, in the boardgame's play order.
 *
 * `games` is how many parties the rows come from, so the same function serves
 * one party (the default) and a whole history: only the « par partie » figure
 * changes meaning between the two.
 */
export function phaseTotals(
  times: PhaseTime[],
  phases: PhaseSpec[] | null,
  games = 1,
): PhaseTotal[] {
  if (!phases || phases.length === 0) {
    return [];
  }

  const summed = sumByPhase(times, phases);
  const grand = summed.reduce((sum, entry) => sum + entry.totalS, 0);

  return summed.map(entry => ({
    key: entry.phase.key,
    label: entry.phase.label,
    totalS: entry.totalS,
    stages: entry.stages,
    averageS: entry.totalS / entry.stages,
    /* c8 ignore next -- `games` is a length the callers always take from a
       non-empty scope; the guard only keeps a division by zero impossible. */
    perGameS: games > 0 ? entry.totalS / games : 0,
    share: grand > 0 ? entry.totalS / grand : 0,
  }));
}

/**
 * The phase turns are taken in, or `null` when the game declares none.
 *
 * There is at most one: a stage has a single moment where the table goes round
 * one by one, and it is the only phase a *player* can be timed in.
 */
export function turnPhase(phases: PhaseSpec[] | null): PhaseSpec | null {
  return phases?.find(phase => phase.clock === "turnTimer") ?? null;
}

/** One player's rhythm inside the phase their turns belong to. */
export interface TurnPhaseStat {
  boardgameId: BoardgameId;
  boardgameName: string;
  /** The phase the turns were taken in — « Réalisation des projets ». */
  label: string;
  /** Parties of that game this player took a turn in. */
  games: number;
  turns: number;
  /** Their average turn, in seconds. */
  averageS: number;
  /** The whole table's average on those same parties, to read it against. */
  tableAverageS: number;
}

/** Mean of a turn list, or 0 when it is empty. */
function meanTurnS(turns: Array<{ durationS: number }>): number {
  /* c8 ignore start -- defensive: the caller keeps only the parties where this
     player took a turn, so neither list it passes can be empty. Kept so the
     helper can never answer NaN if it is ever called from somewhere else. */
  if (turns.length === 0) {
    return 0;
  }
  /* c8 ignore stop */

  return turns.reduce((sum, t) => sum + t.durationS, 0) / turns.length;
}

/**
 * How this player fares in the turn-taking phase of every game that has one.
 *
 * Deliberately the only per-player figure the phases produce: the stopwatch
 * phases are played by the table as one, so attributing a share of them to
 * somebody would be inventing a measurement nobody took.
 */
export function turnPhaseStats(
  records: GameStatsRecord[],
  boardgames: Array<{
    id: BoardgameId;
    name: string;
    phases: PhaseSpec[] | null;
  }>,
  playerId: PlayerId,
): TurnPhaseStat[] {
  return boardgames
    .map(boardgame => {
      const phase = turnPhase(boardgame.phases);
      const played = records.filter(
        r =>
          r.boardgameId === boardgame.id &&
          r.turns.some(t => t.playerId === playerId),
      );

      return { boardgame, phase, played };
    })
    .filter(entry => entry.phase !== null && entry.played.length > 0)
    .map(entry => {
      const turns = entry.played.flatMap(r => r.turns);
      const mine = turns.filter(t => t.playerId === playerId);

      return {
        boardgameId: entry.boardgame.id,
        boardgameName: entry.boardgame.name,
        /* c8 ignore next -- filtered on `phase !== null` just above */
        label: entry.phase?.label ?? "",
        games: entry.played.length,
        turns: mine.length,
        averageS: meanTurnS(mine),
        tableAverageS: meanTurnS(turns),
      };
    });
}
