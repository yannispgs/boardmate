/**
 * Luz across the parties already played: how each player bets, how often the
 * bets come off, and what the safety token is worth.
 *
 * Everything is read off the manches' points and their hedge flag — the only
 * two things the table writes down. A won bet is positive points; a lost one
 * is its cost, a step per trick off (see `bet.ts`).
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type {
  GameStatsRecord,
  PlayerId,
  StageBet,
  StageScore,
} from "@/lib/domain";

import { betWon, tricksOff } from "./bet";

/** How often a set of bets came off, and what they paid on average. */
export interface BetPayoff {
  bets: number;
  won: number;
  /** Null with no bet to read. */
  successRate: number | null;
  avgPoints: number | null;
}

/** One player's way of betting. */
export interface BetPlayerStat {
  playerId: PlayerId;
  name: string;
  bets: number;
  won: number;
  successRate: number;
  /** Bets hedged with the safety token. */
  hedges: number;
  hedgeRate: number;
  /** How often the player hedged on each manche, first first — null where they never played it. */
  hedgeByStage: Array<number | null>;
  /** Tricks off on average when a bet was lost, null with no lost bet. */
  avgMissGap: number | null;
  /** « Prudent et efficace », « Audacieux mais malchanceux »… */
  profile: string;
}

/** One manche across every party: how its bets went. */
export interface BetStageStat {
  stage: number;
  bets: number;
  successRate: number | null;
  hedgeRate: number | null;
}

export interface BetStats {
  players: BetPlayerStat[];
  byStage: BetStageStat[];
  /** The bets hedged with the safety token, and the others. */
  hedged: BetPayoff;
  unhedged: BetPayoff;
}

/** One bet, as the stats read it. */
interface Bet {
  playerId: PlayerId;
  name: string;
  stage: number;
  points: number;
  hedged: boolean;
}

function rate(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

function payoff(bets: readonly Bet[]): BetPayoff {
  const won = bets.filter(b => betWon(b.points)).length;

  return {
    bets: bets.length,
    won,
    successRate: rate(won, bets.length),
    avgPoints: rate(
      bets.reduce((sum, b) => sum + b.points, 0),
      bets.length,
    ),
  };
}

/** How a player bets, in words: cautious or bold, and whether it pays. */
export function betProfile(hedgeRate: number, successRate: number): string {
  const style = hedgeRate >= 0.5 ? "Prudent" : "Audacieux";

  return successRate >= 0.5
    ? `${style} et efficace`
    : `${style} mais malchanceux`;
}

/** A party as the bet stats read it: who sat, and the manches they played. */
export type BetParty = Readonly<{
  players: ReadonlyArray<
    Pick<GameStatsRecord["players"][number], "playerId" | "name">
  >;
  stageScores?: readonly StageScore[];
}>;

/** The stats of a game played on bets, over the parties given. */
export function betStats(
  records: readonly BetParty[],
  bet: StageBet,
  count: number,
): BetStats {
  const bets: Bet[] = records.flatMap(record => {
    const names = new Map(record.players.map(p => [p.playerId, p.name]));

    return (record.stageScores ?? []).flatMap(score => {
      const name = names.get(score.playerId);

      return name === undefined
        ? []
        : [
            {
              playerId: score.playerId,
              name,
              stage: score.stage,
              points: score.points,
              hedged: score.hedged === true,
            },
          ];
    });
  });
  const stages = Array.from({ length: count }, (_v, i) => i + 1);
  const ids = [...new Set(bets.map(b => b.playerId))];

  const players = ids.map(playerId => {
    const mine = bets.filter(b => b.playerId === playerId);
    const won = mine.filter(b => betWon(b.points));
    const lost = mine.filter(b => !betWon(b.points));
    const hedges = mine.filter(b => b.hedged).length;
    const hedgeRate = hedges / mine.length;
    const successRate = won.length / mine.length;

    return {
      playerId,
      name: mine[0].name,
      bets: mine.length,
      won: won.length,
      successRate,
      hedges,
      hedgeRate,
      hedgeByStage: stages.map(stage => {
        const there = mine.filter(b => b.stage === stage);

        return rate(there.filter(b => b.hedged).length, there.length);
      }),
      avgMissGap: rate(
        lost.reduce((sum, b) => sum + tricksOff(bet, b.points), 0),
        lost.length,
      ),
      profile: betProfile(hedgeRate, successRate),
    };
  });

  return {
    players: players.toSorted(
      (a, b) => b.successRate - a.successRate || a.name.localeCompare(b.name),
    ),
    byStage: stages.map(stage => {
      const there = bets.filter(b => b.stage === stage);

      return {
        stage,
        bets: there.length,
        successRate: rate(
          there.filter(b => betWon(b.points)).length,
          there.length,
        ),
        hedgeRate: rate(there.filter(b => b.hedged).length, there.length),
      };
    }),
    hedged: payoff(bets.filter(b => b.hedged)),
    unhedged: payoff(bets.filter(b => !b.hedged)),
  };
}

/** The worst donne of a party: who took it, when, and what it cost. */
export interface BetDrop {
  name: string;
  stage: number;
  points: number;
}

/**
 * What stands out of one party played on bets: its biggest drop — the most a
 * single missed bet cost anyone, null when no bet was missed — and the players
 * who won every one of the `count` bets, the perfect party.
 */
export function betHighlights(
  party: BetParty,
  count: number,
): { drop: BetDrop | null; perfect: string[] } {
  const names = new Map(party.players.map(p => [p.playerId, p.name]));
  const scores = party.stageScores ?? [];
  let drop: BetDrop | null = null;

  for (const score of scores) {
    if (score.points < (drop?.points ?? 0)) {
      drop = {
        /* c8 ignore next -- `?? "?"` guards a score whose player left the table */
        name: names.get(score.playerId) ?? "?",
        stage: score.stage,
        points: score.points,
      };
    }
  }

  return {
    drop,
    perfect: party.players
      .filter(
        p =>
          scores.filter(s => s.playerId === p.playerId && betWon(s.points))
            .length >= count,
      )
      .map(p => p.name),
  };
}
