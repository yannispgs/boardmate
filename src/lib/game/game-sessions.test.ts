import { describe, expect, it } from "vitest";

import type { GameId, GameSessionId } from "@/lib/domain";

import { partyNumber, partyRanks, sessionEntries } from "./game-sessions";

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

describe("partyRanks", () => {
  const party = (id: string, session: string, startedAt: string) => ({
    id: id as GameId,
    sessionId: session as GameSessionId,
    startedAt,
  });

  it("numbers each party of a sitting in the order it was dealt", () => {
    // Given newest first, the way the running list reads.
    const ranks = partyRanks([
      party("g3", "s1", "2026-08-25T18:00:00.000Z"),
      party("g2", "s1", "2026-08-25T17:30:00.000Z"),
      party("g1", "s1", "2026-08-25T17:00:00.000Z"),
    ]);

    expect([...ranks]).toEqual([
      ["g1", 1],
      ["g2", 2],
      ["g3", 3],
    ]);
  });

  it("numbers an evening straddling both sections from one end to the other", () => {
    // The two finished deals and the one still on the table reach the screen in
    // separate lists; the numbering has to see them as one evening.
    const ranks = partyRanks([
      party("running", "s1", "2026-08-25T18:00:00.000Z"),
      party("over1", "s1", "2026-08-25T17:00:00.000Z"),
      party("over2", "s1", "2026-08-25T17:30:00.000Z"),
    ]);

    expect(ranks.get("over1" as GameId)).toBe(1);
    expect(ranks.get("over2" as GameId)).toBe(2);
    expect(ranks.get("running" as GameId)).toBe(3);
  });

  it("leaves a party played on its own unnumbered", () => {
    const ranks = partyRanks([
      party("alone", "s9", "2026-08-25T17:00:00.000Z"),
      party("g1", "s1", "2026-08-25T17:10:00.000Z"),
      party("g2", "s1", "2026-08-25T17:20:00.000Z"),
    ]);

    expect(ranks.has("alone" as GameId)).toBe(false);
    expect(ranks.get("g2" as GameId)).toBe(2);
  });

  it("numbers each sitting from one, not the list", () => {
    const ranks = partyRanks([
      party("a1", "s1", "2026-08-25T17:00:00.000Z"),
      party("a2", "s1", "2026-08-25T17:10:00.000Z"),
      party("b1", "s2", "2026-08-25T20:00:00.000Z"),
      party("b2", "s2", "2026-08-25T20:10:00.000Z"),
    ]);

    expect(ranks.get("b1" as GameId)).toBe(1);
    expect(ranks.get("b2" as GameId)).toBe(2);
  });

  it("reads an empty list as no numbering at all", () => {
    expect(partyRanks([]).size).toBe(0);
  });
});
