import { describe, expect, it } from "vitest";

import type { GameId, GameSessionId, GameStatus } from "@/lib/domain";

import {
  closingSessionSize,
  entryGames,
  partyNumber,
  partyRanks,
  sessionEntries,
  sessionSections,
} from "./game-sessions";

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

describe("entryGames", () => {
  it("reads a lone party as the one party it is", () => {
    expect(entryGames({ kind: "game", game: game("s1", "Papayoo") })).toEqual([
      game("s1", "Papayoo"),
    ]);
  });

  it("reads a sitting as all of its parties", () => {
    const games = [game("s1", "donne 1"), game("s1", "donne 2")];

    expect(
      entryGames({
        kind: "session",
        session: { sessionId: "s1" as GameSessionId, games },
      }),
    ).toEqual(games);
  });
});

describe("closingSessionSize", () => {
  /** A party, reduced to what weighing an abandon looks at. */
  const party = (id: string, session: string, status: GameStatus) => ({
    id: id as GameId,
    sessionId: session as GameSessionId,
    status,
  });

  it("counts the finished parties an abandon would seal the evening at", () => {
    // The retour that asked for this: the evening is only ever continued from
    // the deal on the table, so dropping the last running one shuts it for good.
    const running = party("g3", "s1", "ongoing");
    const sealed = closingSessionSize(running, [
      party("g1", "s1", "ended"),
      party("g2", "s1", "ended"),
      running,
    ]);

    expect(sealed).toBe(2);
  });

  it("seals nothing when the party is alone in its sitting", () => {
    // Nothing survives it, so there is no evening to be shut out of.
    const alone = party("g1", "s1", "ongoing");

    expect(closingSessionSize(alone, [alone])).toBeNull();
  });

  it("seals nothing while another deal is still on the table", () => {
    // That other deal still carries the button that deals the next one.
    const running = party("g2", "s1", "ongoing");
    const sealed = closingSessionSize(running, [
      party("g1", "s1", "ongoing"),
      running,
    ]);

    expect(sealed).toBeNull();
  });

  it("weighs its own sitting and no other", () => {
    // A whole evening's worth of finished parties next door changes nothing.
    const alone = party("g1", "s1", "ongoing");
    const sealed = closingSessionSize(alone, [
      alone,
      party("g2", "s2", "ended"),
      party("g3", "s2", "ended"),
    ]);

    expect(sealed).toBeNull();
  });
});

describe("sessionSections", () => {
  /** A party, reduced to what the split looks at. */
  const deal = (
    id: string,
    session: string,
    startedAt: string,
    status: GameStatus,
  ) => ({
    id: id as GameId,
    sessionId: session as GameSessionId,
    startedAt,
    status,
  });

  it("keeps a whole evening on the table while one deal is still running", () => {
    // The retour that asked for this: two deals over, the third on the table,
    // and « Parties » showed a bare « Papayoo #3 » with the evening folded away
    // under « Terminées ».
    const { live, finished } = sessionSections([
      deal("g1", "s1", "2026-08-26T17:00:00.000Z", "ended"),
      deal("g2", "s1", "2026-08-26T17:30:00.000Z", "ended"),
      deal("g3", "s1", "2026-08-26T18:00:00.000Z", "ongoing"),
    ]);

    expect(finished).toEqual([]);
    expect(live).toHaveLength(1);
    expect(live[0].kind).toBe("session");
    expect(entryGames(live[0]).map(g => g.id)).toEqual(["g3", "g2", "g1"]);
  });

  it("moves an evening over once its last deal is", () => {
    const { live, finished } = sessionSections([
      deal("g1", "s1", "2026-08-26T17:00:00.000Z", "ended"),
      deal("g2", "s1", "2026-08-26T17:30:00.000Z", "ended"),
    ]);

    expect(live).toEqual([]);
    expect(finished).toHaveLength(1);
    expect(entryGames(finished[0]).map(g => g.id)).toEqual(["g2", "g1"]);
  });

  it("files a party played on its own on the side its status says", () => {
    const { live, finished } = sessionSections([
      deal("alone", "s1", "2026-08-26T17:00:00.000Z", "ongoing"),
      deal("over", "s2", "2026-08-26T16:00:00.000Z", "ended"),
    ]);

    expect(live.flatMap(entryGames).map(g => g.id)).toEqual(["alone"]);
    expect(finished.flatMap(entryGames).map(g => g.id)).toEqual(["over"]);
  });

  it("orders both sides newest first, whichever read they came from", () => {
    // The two sections arrive from two separate queries, so the order has to be
    // taken back from the instants rather than from the order they arrived in.
    const { live } = sessionSections([
      deal("old", "s1", "2026-08-26T17:00:00.000Z", "ongoing"),
      deal("new", "s2", "2026-08-26T21:00:00.000Z", "ongoing"),
      deal("mid", "s3", "2026-08-26T19:00:00.000Z", "ongoing"),
    ]);

    expect(live.flatMap(entryGames).map(g => g.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("reads an empty list as two empty sections", () => {
    expect(sessionSections([])).toEqual({ live: [], finished: [] });
  });
});
