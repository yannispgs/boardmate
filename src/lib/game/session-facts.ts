/**
 * The small remarkable facts of an evening — what the table would say out loud
 * between two deals: who posted the biggest pile, who has been losing since the
 * start, who keeps clearing a score the game rarely sees.
 *
 * Two scales meet here, on purpose:
 * - the **facts** are read on the sitting alone, from the parties sharing one
 *   session id, and nothing about them is stored;
 * - the **remarkable score** they are measured against comes from the
 *   boardgame's whole history, because 200 points means nothing until you know
 *   what a party of that game usually pays.
 *
 * An evening needs {@link MIN_PARTIES} finished parties before it says
 * anything: on three deals, « dans 100 % des parties » is noise, and a run of
 * three defeats is just the evening itself.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { BoardgameId, PlayerId, ScoringSpec } from "@/lib/domain";

import type { ScoreDirection } from "./scoring";
import { type SessionParty, scoredPlayers } from "./session-stats";
import { formatNames } from "./tie-break";

/**
 * Finished parties an evening needs before it has a story. Below it the facts
 * would say more about the sample than about the players.
 */
export const MIN_PARTIES = 5;

/** Parties in a row losing (or winning) before the run is worth a mention. */
const MIN_STREAK = 3;

/** Times a mark must be cleared, and how often, before it is a habit. */
const MIN_CROSSINGS = 3;
const MIN_SHARE = 0.5;

/** Past scores needed before the history can say what a good one is. */
const MIN_HISTORY = 8;

export type SessionFactKind =
  | "best-score"
  | "win-streak"
  | "last-streak"
  | "threshold";

export interface SessionFact {
  /** One fact per kind at most, so the panel can't say the same thing twice. */
  kind: SessionFactKind;
  /** The sentence as it is read, French, teasing where it should be. */
  text: string;
}

/**
 * Everything an evening has to say, in a fixed order — the headline score, the
 * runs, then the habit. Each kind speaks once at most: capping the list instead
 * would drop a different fact from one deal to the next, and a panel that
 * reshuffles itself reads as broken rather than lively.
 *
 * `parties` must be **oldest first** — a run of defeats only exists in the
 * order they were played.
 */
export function sessionFacts({
  parties,
  direction,
  remarkable,
}: Readonly<{
  parties: readonly SessionParty[];
  direction: ScoreDirection;
  /** The mark the game rarely sees, or null when history can't name one. */
  remarkable: number | null;
}>): SessionFact[] {
  const played = parties.filter(party => party.ended);

  if (played.length < MIN_PARTIES) {
    return [];
  }

  const facts = [
    bestScoreFact(played, direction),
    streakFact(played, "win-streak"),
    streakFact(played, "last-streak", direction),
    thresholdFact(played, direction, remarkable),
  ];

  return facts.filter(fact => fact !== null);
}

/** The biggest pile of the evening — or the smallest, when small wins. */
function bestScoreFact(
  played: readonly SessionParty[],
  direction: ScoreDirection,
): SessionFact | null {
  let best: number | null = null;
  const holders: string[] = [];

  for (const party of played) {
    for (const player of party.players) {
      if (player.score === null) {
        continue;
      }

      if (best === null || beats(player.score, best, direction)) {
        best = player.score;
        holders.length = 0;
      }

      if (player.score === best && !holders.includes(player.name)) {
        holders.push(player.name);
      }
    }
  }

  if (best === null) {
    return null;
  }

  const what = direction === "highest" ? "Plus gros" : "Plus petit";

  return {
    kind: "best-score",
    text: `${what} score de la soirée : ${formatNames(holders)}, ${best} points`,
  };
}

/**
 * The longest run of victories, or of last places — the same walk down the
 * evening, told with a different verb.
 *
 * A run of defeats needs a full ranking to exist, so a party somebody's score
 * is missing from breaks it rather than being guessed at.
 */
function streakFact(
  played: readonly SessionParty[],
  kind: SessionFactKind,
  direction?: ScoreDirection,
): SessionFact | null {
  const marks = played.map(party =>
    direction === undefined ? winnersOf(party) : lastPlacesOf(party, direction),
  );
  const run = longestRun(marks);

  if (run === null || run.length < MIN_STREAK) {
    return null;
  }

  if (kind === "win-streak") {
    return {
      kind,
      text: `${run.name} enchaîne ${run.length} victoires d'affilée 🔥`,
    };
  }

  return {
    kind,
    text: `${run.name} ferme la marche depuis ${run.length} parties 😬`,
  };
}

/** How often a player clears the mark the game rarely gives up. */
function thresholdFact(
  played: readonly SessionParty[],
  direction: ScoreDirection,
  remarkable: number | null,
): SessionFact | null {
  if (remarkable === null) {
    return null;
  }

  const best = bestCrosser(played, direction, remarkable);

  if (best === null) {
    return null;
  }

  const share = Math.round((best.crossed / best.played) * 100);
  const how =
    direction === "highest"
      ? `passe les ${remarkable} points`
      : `reste sous les ${remarkable} points`;

  return {
    kind: "threshold",
    text: `${best.name} ${how} dans ${share} % de ses parties, joli !`,
  };
}

interface Crosser {
  name: string;
  played: number;
  crossed: number;
}

/** The player who cleared the mark most often, once it is a habit and not a go. */
function bestCrosser(
  played: readonly SessionParty[],
  direction: ScoreDirection,
  remarkable: number,
): Crosser | null {
  const tallies = new Map<PlayerId, Crosser>();

  for (const party of played) {
    for (const player of party.players) {
      const tally = tallies.get(player.id) ?? {
        name: player.name,
        played: 0,
        crossed: 0,
      };

      tally.played += 1;

      if (
        player.score !== null &&
        !beats(remarkable, player.score, direction)
      ) {
        tally.crossed += 1;
      }

      tallies.set(player.id, tally);
    }
  }

  const habits = [...tallies.values()].filter(
    tally =>
      tally.crossed >= MIN_CROSSINGS &&
      tally.crossed / tally.played >= MIN_SHARE,
  );

  return pickBest(habits);
}

/** The most regular of them, ties going to the first name alphabetically. */
function pickBest(habits: readonly Crosser[]): Crosser | null {
  let best: Crosser | null = null;

  for (const habit of habits) {
    if (
      best === null ||
      habit.crossed / habit.played > best.crossed / best.played
    ) {
      best = habit;
      continue;
    }

    if (
      habit.crossed / habit.played === best.crossed / best.played &&
      habit.name.localeCompare(best.name) < 0
    ) {
      best = habit;
    }
  }

  return best;
}

/** Who took this party — several only on a victory no rule separated. */
function winnersOf(party: SessionParty): string[] {
  return party.players.filter(player => player.isWinner).map(p => p.name);
}

/**
 * Who finished last, or nobody when the party can't say: one missing score and
 * the bottom of the ranking is a guess.
 */
function lastPlacesOf(
  party: SessionParty,
  direction: ScoreDirection,
): string[] {
  const scored = scoredPlayers(party);

  if (scored.length !== party.players.length || scored.length < 2) {
    return [];
  }

  let worst: number | null = null;

  for (const player of scored) {
    if (worst === null || beats(worst, player.score, direction)) {
      worst = player.score;
    }
  }

  const last = scored.filter(player => player.score === worst);

  // A whole table level on the last score is a table nobody came last in.
  return last.length === scored.length ? [] : last.map(player => player.name);
}

interface Run {
  name: string;
  length: number;
}

/**
 * The longest streak one name holds without interruption. A party where several
 * names are marked keeps every one of their runs alive — a shared victory
 * breaks nobody's.
 */
function longestRun(marks: ReadonlyArray<readonly string[]>): Run | null {
  const running = new Map<string, number>();
  let best: Run | null = null;

  for (const names of marks) {
    for (const [name] of running) {
      if (!names.includes(name)) {
        running.delete(name);
      }
    }

    for (const name of names) {
      const length = (running.get(name) ?? 0) + 1;

      running.set(name, length);

      if (best === null || length > best.length) {
        best = { name, length };
      }
    }
  }

  return best;
}

/** Whether `score` is the better of the two, the way this game reads scores. */
function beats(
  score: number,
  other: number,
  direction: ScoreDirection,
): boolean {
  return direction === "highest" ? score > other : score < other;
}

/**
 * The score this boardgame rarely gives up, read off its own history — the
 * upper quartile of every score ever posted (the lower one when small wins),
 * rounded to a figure a table would actually say.
 *
 * Null when the history is too thin to have an opinion, and null when the
 * rounded mark lands beyond anything ever achieved: a bar nobody can clear is
 * not a fact, it is a taunt.
 */
export function remarkableScore(
  scores: readonly number[],
  direction: ScoreDirection,
): number | null {
  if (scores.length < MIN_HISTORY) {
    return null;
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const quartile = direction === "highest" ? 0.75 : 0.25;
  const raw = sorted[Math.floor(quartile * (sorted.length - 1))];
  const step = stepFor(raw);
  // Rounded away from the middle, so the mark is always the harder reading of
  // the quartile rather than a bar the median already clears.
  const mark =
    direction === "highest"
      ? Math.ceil(raw / step) * step
      : Math.floor(raw / step) * step;
  // The furthest anybody ever got in the direction that wins: a mark beyond it
  // is a bar nobody can clear.
  const furthest = scores.reduce((far, score) =>
    beats(score, far, direction) ? score : far,
  );
  const reachable = !beats(mark, furthest, direction);

  return reachable ? mark : null;
}

/** The grain a table speaks in: tens over a hundred points, units under twenty. */
function stepFor(value: number): number {
  const size = Math.abs(value);

  if (size >= 500) {
    return 50;
  }

  if (size >= 100) {
    return 10;
  }

  if (size >= 20) {
    return 5;
  }

  return 1;
}

/**
 * The scores of this boardgame's past parties, kept only where they are worth
 * comparing: a game whose scale moves with the table (`playerCountSensitive`)
 * compares against tables of the same size and no other, since the same total
 * is an ordinary evening at three players and a disaster at eight.
 *
 * Deliberately **not** filtered on `trackRecords`. That flag refuses to *crown*
 * a score, and a game refuses it where a single figure owes more to the deal or
 * to the map than to the play — Papayoo, Odin, Catan. What is read here is the
 * opposite kind of number: a quartile taken over every party ever played, which
 * says what this game usually costs. The luck that makes one Papayoo hand a
 * poor record is exactly what a hundred of them average out, so the games with
 * no record to hold are the ones this mark serves best.
 */
export function comparableScores({
  history,
  boardgameId,
  scoring,
  seats,
}: Readonly<{
  history: ReadonlyArray<{
    boardgameId: BoardgameId;
    players: ReadonlyArray<{ score: number | null }>;
  }>;
  boardgameId: BoardgameId;
  scoring: ScoringSpec | null;
  seats: number;
}>): number[] {
  if (scoring === null) {
    return [];
  }

  const atSize = scoring.playerCountSensitive === true;
  const scores: number[] = [];

  for (const party of history) {
    if (party.boardgameId !== boardgameId) {
      continue;
    }

    if (atSize && party.players.length !== seats) {
      continue;
    }

    for (const player of party.players) {
      if (player.score !== null) {
        scores.push(player.score);
      }
    }
  }

  return scores;
}
