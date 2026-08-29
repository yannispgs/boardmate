/**
 * What sitting next to somebody is worth, on a game where the seat **is** the
 * score.
 *
 * On a pair-scored game (Splito) every pile of points is shared by two
 * neighbours and a player's total is the product of the two piles flanking his
 * seat — so your left pile is literally your left neighbour's right pile. « On
 * perd quand il est à côté de nous » is therefore not a superstition there: a
 * neighbour builds half your score with you, by the rules.
 *
 * Two figures answer it, and they are not the same question:
 *
 * - **where his neighbours finish** ({@link NeighbourStat.neighbourPosition}),
 *   the reading asked for — but a placement is made of *both* your piles, so a
 *   neighbour who finished last may have been sunk by the player on his other
 *   side;
 * - **the pile you share** ({@link NeighbourStat.sharedPile}), which is the two
 *   of you and nobody else, read against {@link NeighbourBoard.pileAverage}.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type { GameStatsRecord, PlayerId } from "@/lib/domain";
import { PAIR_LEFT, PAIR_RIGHT } from "./pair-scoring";
import { placements, relativePosition } from "./placement";
import type { ScoreDirection } from "./scoring";

/**
 * The smallest circle that says anything. At three seats everybody is
 * everybody's neighbour, so « à côté de X » names the whole table and the
 * figure degenerates into the table average — it would answer « are these three
 * good » instead of « does X drag his neighbours down ».
 */
export const MIN_SEATS = 4;

/**
 * Parties a player must have on the game before he is listed at all. Below it
 * the figure is one evening's luck wearing the clothes of a verdict, and this
 * page exists to settle an argument — an argument settled wrongly is worse than
 * one left open.
 */
export const MIN_PARTIES = 4;

/**
 * Times two players must have sat side by side before their shared pile is read
 * as anything. Below it the figure is shown but **held at arm's length** by the
 * screen (greyed), never hidden: a reader who came looking for it is owed the
 * number and the reason it can't be trusted yet.
 */
export const MIN_PARTNER_ENCOUNTERS = 6;

/** What one particular neighbour is worth to a player. */
export interface NeighbourPartner {
  playerId: PlayerId;
  name: string;
  /** Parties the two of them spent side by side. */
  encounters: number;
  /** Mean of the piles they built together; null when none was recorded. */
  sharedPile: number | null;
  /** Where this partner finished, averaged — 0 = always first, 1 = always last. */
  position: number | null;
}

/** Everything the game's history says about sitting next to one player. */
export interface NeighbourStat {
  playerId: PlayerId;
  name: string;
  /** Parties of his that counted here — see {@link MIN_SEATS}. */
  parties: number;
  /** Seats that were his neighbour across those parties; two per party. */
  encounters: number;
  /**
   * Where his neighbours finished, averaged over every neighbour-seat — 0 =
   * they always won, 1 = they always came last. Null when nothing counted.
   *
   * ⚠️ Runs **down** like every placement in the app ({@link relativePosition}):
   * the high figure is the damning one.
   */
  neighbourPosition: number | null;
  /** Share of those neighbour-seats that won the party (0–1). */
  neighbourWinRate: number | null;
  /** Mean of every pile he had a hand in; null when none was recorded. */
  sharedPile: number | null;
  /** The same, split by who he built it with — worst pile first. */
  partners: NeighbourPartner[];
}

/** The whole section: one line per player, and what to read a pile against. */
export interface NeighbourBoard {
  stats: NeighbourStat[];
  /**
   * Mean of every pile of every counted party, each pile counted once. A shared
   * pile means nothing on its own — « 6,2 » is only low next to it.
   */
  pileAverage: number | null;
  /** Parties that counted, after the {@link MIN_SEATS} floor. */
  parties: number;
}

/** A seat of a counted party, with the two piles flanking it. */
interface Seat {
  playerId: PlayerId;
  name: string;
  isWinner: boolean;
  position: number | null;
  /** The pile closing onto this seat from the previous one. */
  left: number | null;
  /** The pile this seat opens towards the next one. */
  right: number | null;
}

/** What a player accumulates across the parties, before it is averaged. */
interface Tally {
  name: string;
  parties: number;
  encounters: number;
  positionSum: number;
  positionCount: number;
  wins: number;
  pileSum: number;
  pileCount: number;
  partners: Map<PlayerId, PartnerTally>;
}

interface PartnerTally {
  name: string;
  encounters: number;
  pileSum: number;
  pileCount: number;
  positionSum: number;
  positionCount: number;
}

/** A pile as it was recorded, or null when the party predates pair scoring. */
function pileOf(
  breakdown: Record<string, number> | null | undefined,
  key: string,
): number | null {
  const value = breakdown?.[key];

  return typeof value === "number" ? value : null;
}

/** An empty ledger for a player met for the first time. */
function emptyTally(name: string): Tally {
  return {
    name,
    parties: 0,
    encounters: 0,
    positionSum: 0,
    positionCount: 0,
    wins: 0,
    pileSum: 0,
    pileCount: 0,
    partners: new Map(),
  };
}

/** An empty ledger for a pairing met for the first time. */
function emptyPartner(name: string): PartnerTally {
  return {
    name,
    encounters: 0,
    pileSum: 0,
    pileCount: 0,
    positionSum: 0,
    positionCount: 0,
  };
}

/** A party's seats in seat order, each carrying its placement and its piles. */
function seatsOf(
  record: GameStatsRecord,
  direction: ScoreDirection,
): Seat[] | null {
  const players = [...record.players].sort((a, b) => a.seatOrder - b.seatOrder);

  if (players.length < MIN_SEATS) {
    return null;
  }

  const ranks = placements(players, direction);
  const n = players.length;

  return players.map(p => ({
    playerId: p.playerId,
    name: p.name,
    isWinner: p.isWinner,
    position:
      ranks === null
        ? null
        : relativePosition(ranks.get(p.playerId) as number, n),
    left: pileOf(p.scoreBreakdown, PAIR_LEFT),
    right: pileOf(p.scoreBreakdown, PAIR_RIGHT),
  }));
}

/** Adds what one neighbour of `tally` was worth in one party. */
function recordNeighbour(
  tally: Tally,
  neighbour: Seat,
  /** The pile the two of them share, when it was recorded. */
  pile: number | null,
): void {
  tally.encounters += 1;

  if (neighbour.isWinner) {
    tally.wins += 1;
  }

  if (neighbour.position !== null) {
    tally.positionSum += neighbour.position;
    tally.positionCount += 1;
  }

  if (pile !== null) {
    tally.pileSum += pile;
    tally.pileCount += 1;
  }

  const partner =
    tally.partners.get(neighbour.playerId) ?? emptyPartner(neighbour.name);

  partner.encounters += 1;

  if (pile !== null) {
    partner.pileSum += pile;
    partner.pileCount += 1;
  }

  if (neighbour.position !== null) {
    partner.positionSum += neighbour.position;
    partner.positionCount += 1;
  }

  tally.partners.set(neighbour.playerId, partner);
}

/** A mean, or null when nothing was counted. */
function mean(sum: number, count: number): number | null {
  return count > 0 ? sum / count : null;
}

/**
 * What each player's neighbours came to, across the parties given.
 *
 * Only parties of {@link MIN_SEATS} seats or more count, and only players with
 * at least `minParties` of them are listed. `direction` says which end of the
 * score wins, so the placement is read the way the game is.
 *
 * A party missing a score keeps its win rate and its piles — those are recorded
 * facts — but contributes no placement, since a rank cannot be drawn from an
 * incomplete sheet.
 */
export function computeNeighbourStats(
  records: readonly GameStatsRecord[],
  direction: ScoreDirection,
  minParties: number = MIN_PARTIES,
): NeighbourBoard {
  const tallies = new Map<PlayerId, Tally>();
  let pileSum = 0;
  let pileCount = 0;
  let parties = 0;

  for (const record of records) {
    const seats = seatsOf(record, direction);

    if (seats === null) {
      continue;
    }

    parties += 1;
    const n = seats.length;

    seats.forEach((seat, i) => {
      const tally = tallies.get(seat.playerId) ?? emptyTally(seat.name);

      tally.parties += 1;
      // The circle closes, so the first and last seats are neighbours like any
      // other pair — and at four seats or more the two are never the same
      // player, which is what MIN_SEATS buys.
      recordNeighbour(tally, seats[(i + 1) % n], seat.right);
      recordNeighbour(tally, seats[(i - 1 + n) % n], seat.left);
      tallies.set(seat.playerId, tally);

      // Each pile belongs to two seats; counting it on the right-hand one only
      // keeps the average an average of piles, not of halves of piles.
      if (seat.right !== null) {
        pileSum += seat.right;
        pileCount += 1;
      }
    });
  }

  const stats: NeighbourStat[] = [];

  for (const [playerId, tally] of tallies) {
    if (tally.parties < minParties) {
      continue;
    }

    stats.push({
      playerId,
      name: tally.name,
      parties: tally.parties,
      encounters: tally.encounters,
      neighbourPosition: mean(tally.positionSum, tally.positionCount),
      neighbourWinRate: mean(tally.wins, tally.encounters),
      sharedPile: mean(tally.pileSum, tally.pileCount),
      partners: partnersOf(tally),
    });
  }

  // The heaviest curse first — that is the line the argument is about, and a
  // list read for one name is read from the top.
  stats.sort(byPositionDesc);

  return { stats, pileAverage: mean(pileSum, pileCount), parties };
}

/** One player's partners, the thinnest pile first. */
function partnersOf(tally: Tally): NeighbourPartner[] {
  return [...tally.partners.entries()]
    .map(([playerId, p]) => ({
      playerId,
      name: p.name,
      encounters: p.encounters,
      sharedPile: mean(p.pileSum, p.pileCount),
      position: mean(p.positionSum, p.positionCount),
    }))
    .sort((a, b) => (a.sharedPile ?? Infinity) - (b.sharedPile ?? Infinity));
}

/**
 * Worst neighbour first: the highest average placement, which on a scale where
 * 0 is the win means the player whose neighbours finish lowest. A player whose
 * parties left no placement at all sinks to the bottom rather than passing for
 * a saint.
 */
function byPositionDesc(a: NeighbourStat, b: NeighbourStat): number {
  return (b.neighbourPosition ?? -1) - (a.neighbourPosition ?? -1);
}
