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

import type { GameSessionId } from "@/lib/domain";

/** The little a grouping needs to know about a game. */
export interface SessionableGame {
  sessionId: GameSessionId;
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
