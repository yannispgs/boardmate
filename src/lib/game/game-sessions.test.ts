import { describe, expect, it } from "vitest";

import type { GameId, GameSessionId } from "@/lib/domain";

import { partyNumber, sessionEntries } from "./game-sessions";

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

describe("partyNumber", () => {
  const dealt = (...ids: string[]) => ids.map(id => ({ id: id as GameId }));

  it("says nothing while the sitting is one party long", () => {
    // A first deal does not know yet that it will become an evening.
    expect(partyNumber(dealt("g1"), "g1" as GameId)).toBeNull();
  });

  it("numbers a party by its place in the sitting", () => {
    const sitting = dealt("g1", "g2", "g3");

    expect(partyNumber(sitting, "g1" as GameId)).toBe(1);
    expect(partyNumber(sitting, "g3" as GameId)).toBe(3);
  });

  it("says nothing about a party missing from its own sitting", () => {
    // The list was read before the party was saved: no number beats a wrong one.
    expect(partyNumber(dealt("g1", "g2"), "g9" as GameId)).toBeNull();
  });

  it("says nothing when there is no sitting to speak of", () => {
    expect(partyNumber([], "g1" as GameId)).toBeNull();
  });
});
