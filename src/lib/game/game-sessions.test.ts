import { describe, expect, it } from "vitest";

import type { GameSessionId } from "@/lib/domain";

import { sessionEntries } from "./game-sessions";

/** A game, reduced to the only thing a grouping looks at. */
function game(session: string, name: string) {
  return { sessionId: session as GameSessionId, name };
}

describe("sessionEntries", () => {
  it("leaves a game played on its own as a game", () => {
    // Every game carries a session, so a session of one has to stay a plain
    // line — otherwise the whole list turns into disclosures.
    expect(sessionEntries([game("s1", "Papayoo")])).toEqual([
      { kind: "game", game: game("s1", "Papayoo") },
    ]);
  });

  it("folds the parties of one sitting into a single entry", () => {
    const entries = sessionEntries([
      game("s1", "donne 3"),
      game("s1", "donne 2"),
      game("s1", "donne 1"),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      kind: "session",
      session: {
        sessionId: "s1",
        games: [
          game("s1", "donne 3"),
          game("s1", "donne 2"),
          game("s1", "donne 1"),
        ],
      },
    });
  });

  it("keeps the order the sittings first appear in", () => {
    const entries = sessionEntries([
      game("s1", "a"),
      game("s2", "b"),
      game("s1", "c"),
      game("s3", "d"),
    ]);

    expect(
      entries.map(e => (e.kind === "session" ? e.session.sessionId : "—")),
    ).toEqual(["s1", "—", "—"]);
    expect(entries[0]).toEqual({
      kind: "session",
      session: { sessionId: "s1", games: [game("s1", "a"), game("s1", "c")] },
    });
  });

  it("reads an empty list as an empty one", () => {
    expect(sessionEntries([])).toEqual([]);
  });
});
