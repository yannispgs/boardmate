/**
 * The end-of-game figures of a game counted manche by manche (Odin).
 *
 * Such a game times nothing — the table closes a manche, writes down what
 * everyone was left holding, and deals again — so there is no turn log to read
 * and no rhythm to plot. What there is to read is the manches themselves, and
 * the rules give them their shape: exactly one player goes out at 0, everybody
 * else is caught holding cards, the lightest total wins, and the game stops as
 * soon as a total reaches the target.
 *
 * Going out is therefore the thing worth counting, and « what a manche cost you
 * when you didn't » is the thing worth averaging — a player who goes out often
 * and picks up little is playing the game the way it is meant to be played.
 */

import type { PlayerId, StageScore } from "@/lib/domain";

import type { PlayerSeries } from "./score-series";

/** A player as the stats panel knows them. */
export interface TallyPlayer {
  playerId: PlayerId;
  name: string;
}

/** One player's line, over the manches of a single game. */
export interface TallyPlayerStat extends TallyPlayer {
  /** Manches they closed at 0 — the times they went out. */
  exits: number;
  /** Manches they were caught holding cards. */
  caught: number;
  /** Points picked up over those manches. */
  caughtPoints: number;
  /** Mean cost of a manche they didn't go out on; null when they always did. */
  avgCaught: number | null;
  /** The heaviest single manche they took (0 when they never took any). */
  worst: number;
  /** Their final total — the manches summed. */
  total: number;
}

/** The heaviest manche of a game: who took it, when, and how much. */
export interface TallyWorstStage extends TallyPlayer {
  stage: number;
  points: number;
}

/** The manche that ended the game: the first to push a total to the target. */
export interface TallyFatalStage {
  stage: number;
  /** Who crossed on it — usually one player, several on a simultaneous cross. */
  names: string[];
}

export interface TallyStats {
  /** Manches actually written down. */
  stageCount: number;
  /** One line per player, heaviest goer-out first. */
  players: TallyPlayerStat[];
  worstStage: TallyWorstStage | null;
  /** Points the whole table picked up per manche; null before any manche. */
  avgPointsPerStage: number | null;
  fatalStage: TallyFatalStage | null;
}

/** The distinct manches a set of scores covers. */
function stageNumbers(scores: readonly StageScore[]): number[] {
  return [...new Set(scores.map(s => s.stage))].sort((a, b) => a - b);
}

/**
 * The manches of one game read as end-of-game statistics. `target` is the score
 * the game stops at — pass `null` for a game played without one, and the fatal
 * manche is simply left out.
 */
export function computeTallyStats({
  players,
  scores,
  target,
}: Readonly<{
  players: readonly TallyPlayer[];
  scores: readonly StageScore[];
  target: number | null;
}>): TallyStats {
  const stages = stageNumbers(scores);
  const lines = players.map(player => tallyLine(player, scores));

  return {
    stageCount: stages.length,
    players: lines.sort(byExitsThenCost),
    worstStage: worstStage(players, scores),
    avgPointsPerStage:
      stages.length === 0
        ? null
        : scores.reduce((sum, s) => sum + s.points, 0) / stages.length,
    fatalStage: fatalStage(players, scores, stages, target),
  };
}

/** One player's manches, folded into their line. */
function tallyLine(
  player: TallyPlayer,
  scores: readonly StageScore[],
): TallyPlayerStat {
  const mine = scores.filter(s => s.playerId === player.playerId);
  const caught = mine.filter(s => s.points > 0);
  const caughtPoints = caught.reduce((sum, s) => sum + s.points, 0);

  return {
    ...player,
    exits: mine.length - caught.length,
    caught: caught.length,
    caughtPoints,
    avgCaught: caught.length === 0 ? null : caughtPoints / caught.length,
    worst: caught.reduce((worst, s) => Math.max(worst, s.points), 0),
    total: mine.reduce((sum, s) => sum + s.points, 0),
  };
}

/**
 * Most times out first; between two players who went out as often, the one who
 * pays less for it. A player who never got caught leads that tie-break, having
 * paid nothing at all.
 */
function byExitsThenCost(a: TallyPlayerStat, b: TallyPlayerStat): number {
  if (a.exits !== b.exits) {
    return b.exits - a.exits;
  }

  return (a.avgCaught ?? -1) - (b.avgCaught ?? -1);
}

/** The single heaviest manche anybody took, latest ties kept out. */
function worstStage(
  players: readonly TallyPlayer[],
  scores: readonly StageScore[],
): TallyWorstStage | null {
  const names = new Map(players.map(p => [p.playerId, p.name]));
  let worst: TallyWorstStage | null = null;

  for (const score of scores) {
    if (score.points > (worst?.points ?? 0)) {
      worst = {
        playerId: score.playerId,
        /* c8 ignore next -- `?? "?"` guards a score whose player left the table */
        name: names.get(score.playerId) ?? "?",
        stage: score.stage,
        points: score.points,
      };
    }
  }

  return worst;
}

/**
 * The manche a total first reached the target on — the one that ended the game.
 * Read on the running totals, never on a single manche: the target is what a
 * player has accumulated.
 */
function fatalStage(
  players: readonly TallyPlayer[],
  scores: readonly StageScore[],
  stages: readonly number[],
  target: number | null,
): TallyFatalStage | null {
  if (target === null) {
    return null;
  }

  const totals = new Map<PlayerId, number>();

  for (const stage of stages) {
    const crossed: string[] = [];

    for (const player of players) {
      // Nobody has reached the target yet — the loop returns on the manche one
      // does — so a total at or above it here has just crossed.
      const after =
        (totals.get(player.playerId) ?? 0) +
        scores
          .filter(s => s.stage === stage && s.playerId === player.playerId)
          .reduce((sum, s) => sum + s.points, 0);

      totals.set(player.playerId, after);

      if (after >= target) {
        crossed.push(player.name);
      }
    }

    if (crossed.length > 0) {
      return { stage, names: crossed };
    }
  }

  return null;
}

/**
 * The running totals as one line per player, for the evolution chart: the
 * x-axis is the manche (0–1 of the game's length), the y-axis the total so far.
 * A player with no line for a manche simply holds their total across it.
 */
export function buildStageTotalsSeries(
  players: readonly TallyPlayer[],
  scores: readonly StageScore[],
): { series: PlayerSeries[]; maxScore: number } {
  const stages = stageNumbers(scores);

  if (stages.length === 0) {
    return { series: [], maxScore: 0 };
  }

  let maxScore = 0;

  const series = players.map(player => {
    const points = [{ x: 0, score: 0 }];
    let total = 0;

    stages.forEach((stage, index) => {
      total += scores
        .filter(s => s.stage === stage && s.playerId === player.playerId)
        .reduce((sum, s) => sum + s.points, 0);
      maxScore = Math.max(maxScore, total);
      points.push({ x: (index + 1) / stages.length, score: total });
    });

    return { playerId: player.playerId, points };
  });

  return { series, maxScore: Math.max(1, maxScore) };
}
