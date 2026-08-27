/**
 * How the evening is going, read back out of the parties it is made of.
 *
 * A sitting of short deals (Papayoo) is a dozen parties long, and between two
 * deals the table wants to know where it stands — not by walking back to the
 * statistics page, which averages the whole history, but here, on the party
 * being played.
 *
 * **Nothing about a sitting is stored.** These figures are recomputed from the
 * parties carrying the same session id, which is the only thing the database
 * knows about an evening. That also keeps the sitting free of a result of its
 * own: it has no winner and no cumulative score, only the parties' own.
 *
 * Scores are **averaged, never added up**. A total would crown somebody over a
 * dozen deals — the competition {@link sessionEntries} deliberately refuses to
 * invent — while an average says how the deals went and stays readable when a
 * player joins the table halfway through.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { GameListItem, PlayerId } from "@/lib/domain";

import { finalStandings, type ScoreDirection } from "./scoring";

/** What the standing needs to know about one party of the sitting. */
export interface SessionParty {
  /** Only ended parties count: the one on the table has no result yet. */
  ended: boolean;
  players: ReadonlyArray<{
    id: PlayerId;
    name: string;
    isWinner: boolean;
    score: number | null;
  }>;
}

/**
 * The sitting's parties as every reading of an evening wants them — one shape,
 * so the standing and the facts can never disagree on what a party is. Order is
 * carried through untouched: a run of defeats only exists in the order played.
 */
export function sessionParties(games: readonly GameListItem[]): SessionParty[] {
  return games.map(game => ({
    ended: game.status === "ended",
    players: game.players,
  }));
}

/** One player's evening. */
export interface SessionPlayerStat {
  playerId: PlayerId;
  name: string;
  /** Parties of the sitting this player sat at — not the sitting's total. */
  games: number;
  wins: number;
  /** Mean score over the parties they were scored in; null if none were. */
  avgScore: number | null;
  /** Mean finishing place; null when no party of theirs was fully scored. */
  avgPlace: number | null;
}

/** A player of a party whose box was filled in — the only rankable kind. */
export type ScoredPlayer = SessionParty["players"][number] & { score: number };

/** The players whose box was filled in, narrowed so no `?? 0` is ever needed. */
export function scoredPlayers(party: SessionParty): ScoredPlayer[] {
  return party.players.filter((p): p is ScoredPlayer => p.score !== null);
}

interface Tally {
  name: string;
  games: number;
  wins: number;
  scoreSum: number;
  scoreCount: number;
  placeSum: number;
  placeCount: number;
}

/**
 * Every player of the sitting, best first: most wins, then best average place,
 * then by name so the order never wobbles between two renders.
 *
 * Ranks each party the way its own recap does — {@link finalStandings}, so a
 * co-leader the tie-break separated is second rather than a shared first. A
 * party where somebody's score is missing contributes wins but no place: half a
 * ranking would say more about the missing box than about the players.
 */
export function sessionStanding(
  parties: readonly SessionParty[],
  direction: ScoreDirection,
): SessionPlayerStat[] {
  const tallies = new Map<PlayerId, Tally>();

  for (const party of parties) {
    if (!party.ended) {
      continue;
    }

    const places = partyPlaces(party, direction);

    for (const player of party.players) {
      const tally = entry(tallies, player.id, player.name);

      tally.games += 1;
      tally.wins += player.isWinner ? 1 : 0;

      if (player.score !== null) {
        tally.scoreSum += player.score;
        tally.scoreCount += 1;
      }

      const place = places?.get(player.id);

      if (place !== undefined) {
        tally.placeSum += place;
        tally.placeCount += 1;
      }
    }
  }

  return [...tallies]
    .map(([playerId, tally]) => ({
      playerId,
      name: tally.name,
      games: tally.games,
      wins: tally.wins,
      avgScore: mean(tally.scoreSum, tally.scoreCount),
      avgPlace: mean(tally.placeSum, tally.placeCount),
    }))
    .sort(bestFirst);
}

/**
 * Where this party's players finished, or null when it cannot be said — one
 * missing score and every place below it is a guess.
 */
function partyPlaces(
  party: SessionParty,
  direction: ScoreDirection,
): Map<PlayerId, number> | null {
  const scored = scoredPlayers(party);

  if (scored.length !== party.players.length || scored.length === 0) {
    return null;
  }

  const ranked = finalStandings(
    scored.map(p => ({
      playerId: p.id,
      score: p.score,
      isWinner: p.isWinner,
    })),
    direction,
  );

  return new Map(ranked.map(r => [r.playerId, r.rank]));
}

/** This player's running tally, opened on the party they first appear in. */
function entry(
  tallies: Map<PlayerId, Tally>,
  playerId: PlayerId,
  name: string,
): Tally {
  const started = tallies.get(playerId);

  if (started !== undefined) {
    return started;
  }

  const tally: Tally = {
    name,
    games: 0,
    wins: 0,
    scoreSum: 0,
    scoreCount: 0,
    placeSum: 0,
    placeCount: 0,
  };

  tallies.set(playerId, tally);

  return tally;
}

/** Null rather than a zero when nothing was counted: there is no mean of none. */
function mean(sum: number, count: number): number | null {
  if (count === 0) {
    return null;
  }

  return sum / count;
}

/** Most wins first, then the best average place, then alphabetically. */
function bestFirst(a: SessionPlayerStat, b: SessionPlayerStat): number {
  if (a.wins !== b.wins) {
    return b.wins - a.wins;
  }

  // A player with no place yet sits below one who has one, whatever it is:
  // « pas encore classé » is not a good result, it is an absent one.
  if (a.avgPlace !== b.avgPlace) {
    return (
      (a.avgPlace ?? Number.POSITIVE_INFINITY) -
      (b.avgPlace ?? Number.POSITIVE_INFINITY)
    );
  }

  return a.name.localeCompare(b.name);
}
