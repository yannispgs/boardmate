import { describe, expect, it } from "vitest";

import type { GameListItem, PlayerId } from "@/lib/domain";

import {
  type SessionParty,
  sessionParties,
  sessionStanding,
} from "./session-stats";

const ANNE = "p-anne" as PlayerId;
const BOB = "p-bob" as PlayerId;
const CLARA = "p-clara" as PlayerId;

const NAMES: Record<string, string> = {
  [ANNE]: "Anne",
  [BOB]: "Bob",
  [CLARA]: "Clara",
};

/** One party of the sitting: who sat at it, their score, and who took it. */
function party(
  scores: Array<[PlayerId, number | null]>,
  winners: PlayerId[],
  ended = true,
): SessionParty {
  return {
    ended,
    players: scores.map(([id, score]) => ({
      id,
      name: NAMES[id],
      isWinner: winners.includes(id),
      score,
    })),
  };
}

describe("sessionParties", () => {
  it("keeps only what a sitting is read from, in the order played", () => {
    const listed = [
      { status: "ended", players: [{ id: ANNE, name: "Anne" }] },
      { status: "ongoing", players: [{ id: BOB, name: "Bob" }] },
    ] as unknown as GameListItem[];

    expect(sessionParties(listed)).toEqual([
      { ended: true, players: [{ id: ANNE, name: "Anne" }] },
      { ended: false, players: [{ id: BOB, name: "Bob" }] },
    ]);
  });
});

describe("sessionStanding", () => {
  it("averages the scores rather than adding them up", () => {
    // Two deals of Papayoo: a total would crown somebody over the evening,
    // which a sitting deliberately never does.
    const stats = sessionStanding(
      [
        party(
          [
            [ANNE, 100],
            [BOB, 150],
          ],
          [ANNE],
        ),
        party(
          [
            [ANNE, 60],
            [BOB, 190],
          ],
          [ANNE],
        ),
      ],
      "lowest",
    );

    expect(stats.map(s => [s.name, s.games, s.wins, s.avgScore])).toEqual([
      ["Anne", 2, 2, 80],
      ["Bob", 2, 0, 170],
    ]);
  });

  it("averages the place in the game's own direction", () => {
    // Lowest wins here, so 60 is a first place and 190 a second.
    const stats = sessionStanding(
      [
        party(
          [
            [ANNE, 100],
            [BOB, 150],
            [CLARA, 0],
          ],
          [CLARA],
        ),
        party(
          [
            [ANNE, 60],
            [BOB, 190],
            [CLARA, 0],
          ],
          [CLARA],
        ),
      ],
      "lowest",
    );

    expect(stats.map(s => [s.name, s.avgPlace])).toEqual([
      ["Clara", 1],
      ["Anne", 2],
      ["Bob", 3],
    ]);
  });

  it("ranks a separated co-leader below the winner, as the recap does", () => {
    // Level on score, but the tie-break named Anne: Bob is second, not a
    // shared first — the same reading the finished-game panel gives.
    const stats = sessionStanding(
      [
        party(
          [
            [ANNE, 10],
            [BOB, 10],
          ],
          [ANNE],
        ),
      ],
      "highest",
    );

    expect(stats.map(s => [s.name, s.avgPlace])).toEqual([
      ["Anne", 1],
      ["Bob", 2],
    ]);
  });

  it("ignores the party still on the table", () => {
    const stats = sessionStanding(
      [
        party(
          [
            [ANNE, 10],
            [BOB, 4],
          ],
          [ANNE],
        ),
        party(
          [
            [ANNE, null],
            [BOB, null],
          ],
          [],
          false,
        ),
      ],
      "highest",
    );

    expect(stats.map(s => [s.name, s.games])).toEqual([
      ["Anne", 1],
      ["Bob", 1],
    ]);
  });

  it("counts only the parties a latecomer sat at", () => {
    const stats = sessionStanding(
      [
        party(
          [
            [ANNE, 10],
            [BOB, 4],
          ],
          [ANNE],
        ),
        party(
          [
            [ANNE, 2],
            [BOB, 4],
            [CLARA, 20],
          ],
          [CLARA],
        ),
      ],
      "highest",
    );
    const clara = stats.find(s => s.name === "Clara");

    expect(clara).toMatchObject({ games: 1, wins: 1, avgScore: 20 });
  });

  it("gives no place to a party somebody's score is missing from", () => {
    // Half a ranking would say more about the empty box than about the table.
    const stats = sessionStanding(
      [
        party(
          [
            [ANNE, 10],
            [BOB, null],
          ],
          [ANNE],
        ),
      ],
      "highest",
    );

    expect(stats.map(s => [s.name, s.wins, s.avgScore, s.avgPlace])).toEqual([
      ["Anne", 1, 10, null],
      ["Bob", 0, null, null],
    ]);
  });

  it("gives no place to an unscored game either", () => {
    const stats = sessionStanding(
      [
        party(
          [
            [ANNE, null],
            [BOB, null],
          ],
          [BOB],
        ),
      ],
      "highest",
    );

    expect(stats.map(s => [s.name, s.wins, s.avgPlace])).toEqual([
      ["Bob", 1, null],
      ["Anne", 0, null],
    ]);
  });

  it("sits a player with no place below one who has any", () => {
    // « Pas encore classé » is an absent result, not a good one.
    const stats = sessionStanding(
      [party([[ANNE, null]], []), party([[BOB, 3]], [])],
      "highest",
    );

    expect(stats.map(s => s.name)).toEqual(["Bob", "Anne"]);
  });

  it("sits the unplaced player last whichever deal opened the evening", () => {
    // Same reading as above with the parties dealt the other way round: the
    // order of the sitting must not decide who leads it.
    const stats = sessionStanding(
      [party([[ANNE, 3]], []), party([[BOB, null]], [])],
      "highest",
    );

    expect(stats.map(s => s.name)).toEqual(["Anne", "Bob"]);
  });

  it("breaks a dead heat by name so the order never wobbles", () => {
    const stats = sessionStanding(
      [party([[BOB, 5]], []), party([[ANNE, 5]], [])],
      "highest",
    );

    expect(stats.map(s => s.name)).toEqual(["Anne", "Bob"]);
  });

  it("reads a sitting nothing has been played in as empty", () => {
    expect(sessionStanding([], "highest")).toEqual([]);
    expect(sessionStanding([party([], [], false)], "highest")).toEqual([]);
  });

  it("reads a party nobody sat at without inventing anybody", () => {
    expect(sessionStanding([party([], [])], "highest")).toEqual([]);
  });
});
