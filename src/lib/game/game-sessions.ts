/**
 * An evening, read back out of the parties it was made of.
 *
 * Games dealt one after another from the score sheet carry the same session, so
 * a Papayoo evening reaches the list as a dozen near-identical lines. Grouping
 * them puts the evening back together — and only the evening: a session has no
 * winner and no cumulative score. The table already knows who won each deal, and
 * adding those scores up would invent a competition nobody agreed to play.
 *
 * A session of one is deliberately *not* a group. Every game carries a session
 * id, so treating them all as groups would fold the whole list into disclosures
 * nobody asked to open.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { GameId, GameSessionId, GameStatus } from "@/lib/domain";

/** The little a grouping needs to know about a game. */
export interface SessionableGame {
  sessionId: GameSessionId;
}

/**
 * Which party of the sitting this one is, 1-based — or null while the sitting
 * is only one party long.
 *
 * A first deal does not know yet that it will become an evening, and « 1ʳᵉ
 * partie » stamped on every party ever played on its own would be a permanent
 * line saying nothing. The counter appears when the chaining starts.
 *
 * `games` is the sitting oldest first, which is the order the parties were
 * dealt in.
 */
export function partyNumber(
  games: ReadonlyArray<{ id: GameId }>,
  gameId: GameId,
): number | null {
  if (games.length < 2) {
    return null;
  }

  const index = games.findIndex(game => game.id === gameId);

  // A party missing from its own sitting means the list was read before it was
  // saved; saying nothing beats numbering it wrong.
  if (index === -1) {
    return null;
  }

  return index + 1;
}

/** What numbering a whole list needs of a game, on top of its sitting. */
export interface RankableGame extends SessionableGame {
  id: GameId;
  startedAt: string;
}

/**
 * Which party of its sitting each game is, 1-based — {@link partyNumber} read
 * for a whole list at once, so a card can say « #2 » without knowing anything
 * about the evening it belongs to.
 *
 * Must be given **every** party, the ones on the table and the ones over alike:
 * « Parties » shows them in two sections, and an evening straddling both would
 * otherwise be numbered from one on each side. Sittings of a single party are
 * left out, for the same reason `partyNumber` answers null on them.
 *
 * The order the list happens to read in is not the order the parties were
 * dealt in (the running ones come newest first), so the numbering is taken on
 * the start instants — ISO instants compare as text.
 */
export function partyRanks(
  games: readonly RankableGame[],
): Map<GameId, number> {
  const dealt = [...games].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  const ranks = new Map<GameId, number>();

  for (const entry of sessionEntries(dealt)) {
    if (entry.kind === "session") {
      entry.session.games.forEach((game, index) => {
        ranks.set(game.id, index + 1);
      });
    }
  }

  return ranks;
}

/** Several parties of one sitting, in the order the list gave them. */
export interface GameSession<TGame> {
  sessionId: GameSessionId;
  games: TGame[];
}

/**
 * One entry of the list: either a lone party, or the session that folds
 * several of them into a single row.
 */
export type SessionEntry<TGame> =
  | { kind: "game"; game: TGame }
  | { kind: "session"; session: GameSession<TGame> };

/**
 * The list, with each sitting of two parties or more folded into one entry.
 *
 * Order is preserved twice over: the entries follow the order in which their
 * sessions first appear, and each session's parties stay in the order they came
 * in. The caller has already sorted the list the way it wants to read it, and a
 * grouping has no business re-deciding that.
 */
export function sessionEntries<TGame extends SessionableGame>(
  games: readonly TGame[],
): Array<SessionEntry<TGame>> {
  const sessions: Array<GameSession<TGame>> = [];
  const bySession = new Map<GameSessionId, GameSession<TGame>>();

  for (const game of games) {
    const started = bySession.get(game.sessionId);

    if (started === undefined) {
      // Held in both, so the map answers « already seen? » while the array
      // keeps the order the games arrived in.
      const session: GameSession<TGame> = {
        sessionId: game.sessionId,
        games: [game],
      };

      bySession.set(game.sessionId, session);
      sessions.push(session);
    } else {
      started.games.push(game);
    }
  }

  return sessions.map((session): SessionEntry<TGame> => {
    if (session.games.length === 1) {
      return { kind: "game", game: session.games[0] };
    }

    return { kind: "session", session };
  });
}

/** The parties an entry stands for — one, or the whole sitting. */
export function entryGames<TGame>(entry: SessionEntry<TGame>): TGame[] {
  if (entry.kind === "game") {
    return [entry.game];
  }

  return entry.session.games;
}

/** What splitting the list into its two sections needs of a game. */
export interface SectionableGame extends RankableGame {
  status: GameStatus;
}

/** The two sections « Parties » reads in. */
export interface SessionSections<TGame> {
  /** Still on the table — including the finished deals of a running evening. */
  live: Array<SessionEntry<TGame>>;
  /** Over, and behind the « Terminées » fold. */
  finished: Array<SessionEntry<TGame>>;
}

/**
 * The list as « Parties » shows it: newest first, sittings folded, and split
 * between what is still on the table and what is over.
 *
 * **An evening moves to « Terminées » only once every party of it is over.**
 * Splitting the parties by status *first* and grouping each side on its own is
 * what buried a running Papayoo: the evening was cut in two, the deal on the
 * table was left alone on its side — a sitting of one is not a sitting — and it
 * reached the screen as a bare « Papayoo #3 » while the evening it belonged to
 * sat folded away under « Terminées ». Grouping first and splitting after keeps
 * the evening whole and puts it where its most recent deal is.
 *
 * The order is decided here rather than taken from the caller, because the two
 * halves arrive from two separate reads: an evening straddling them would
 * otherwise be laid out by which read it came from rather than by when it was
 * played.
 */
export function sessionSections<TGame extends SectionableGame>(
  games: readonly TGame[],
): SessionSections<TGame> {
  const newestFirst = [...games].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
  const sections: SessionSections<TGame> = { live: [], finished: [] };

  for (const entry of sessionEntries(newestFirst)) {
    const over = entryGames(entry).every(game => game.status === "ended");

    sections[over ? "finished" : "live"].push(entry);
  }

  return sections;
}
