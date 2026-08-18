import { describe, expect, it } from "vitest";

import type {
  BoardgameId,
  GameId,
  GameListItem,
  GameStatus,
  PlayerId,
} from "@/lib/domain";
import {
  activeFilterCount,
  filterablePlayers,
  filterGameList,
  localDay,
  matchesGameFilter,
  NO_GAME_FILTER,
  playedBoardgames,
} from "./game-filters";

/** A games-list entry with only what filtering looks at. */
function game(
  id: string,
  boardgameId: string,
  startedAt: string,
  players: Array<[string, string]>,
  status: GameStatus = "ongoing",
): GameListItem {
  return {
    id: id as GameId,
    boardgameId: boardgameId as BoardgameId,
    configId: null,
    configValues: null,
    status,
    round: 1,
    turn: 1,
    stage: 1,
    phase: 0,
    currentPlayerId: null,
    startedAt,
    // A game played past midnight ends on the NEXT day — which is what makes
    // "filed under the day it started" an assertion and not a coincidence.
    endedAt: status === "ended" ? "2026-07-21T01:00:00.000Z" : null,
    tieBreak: null,
    players: players.map(([playerId, name]) => ({
      id: playerId as PlayerId,
      name,
      isWinner: false,
      score: null,
    })),
    extensions: [],
  };
}

const catanWithBoth = game("g1", "catan", "2026-07-01T20:00:00.000Z", [
  ["p1", "Zoé"],
  ["p2", "Amélie"],
]);
const cascadiaWithOne = game("g2", "cascadia", "2026-07-15T20:00:00.000Z", [
  ["p1", "Zoé"],
  ["p3", "Bruno"],
]);
const catanLater = game(
  "g3",
  "catan",
  "2026-07-20T20:00:00.000Z",
  [["p2", "Amélie"]],
  "ended",
);
const all = [catanWithBoth, cascadiaWithOne, catanLater];

describe("matchesGameFilter", () => {
  const one = {
    boardgameId: "catan",
    playerIds: ["p1", "p2"],
    day: "2026-07-10",
    status: "ongoing" as GameStatus,
  };

  it("keeps everything when nothing is asked", () => {
    expect(matchesGameFilter(one, {})).toBe(true);
    expect(matchesGameFilter(one, NO_GAME_FILTER)).toBe(true);
  });

  it("keeps only the boardgames asked for", () => {
    expect(
      matchesGameFilter(one, { boardgameIds: ["catan" as BoardgameId] }),
    ).toBe(true);
    expect(
      matchesGameFilter(one, { boardgameIds: ["cascadia" as BoardgameId] }),
    ).toBe(false);
  });

  it("asks for every named player at once, not any of them", () => {
    expect(
      matchesGameFilter(one, { playerIds: ["p1", "p2"] as PlayerId[] }),
    ).toBe(true);
    expect(
      matchesGameFilter(one, { playerIds: ["p1", "p9"] as PlayerId[] }),
    ).toBe(false);
  });

  it("holds the window at both ends, inclusively", () => {
    expect(matchesGameFilter(one, { from: "2026-07-10" })).toBe(true);
    expect(matchesGameFilter(one, { until: "2026-07-10" })).toBe(true);
    expect(matchesGameFilter(one, { from: "2026-07-11" })).toBe(false);
    expect(matchesGameFilter(one, { until: "2026-07-09" })).toBe(false);
  });

  it("keeps only the status asked for", () => {
    expect(matchesGameFilter(one, { status: "ongoing" })).toBe(true);
    expect(matchesGameFilter(one, { status: "ended" })).toBe(false);
    expect(matchesGameFilter(one, { status: null })).toBe(true);
  });
});

describe("activeFilterCount", () => {
  it("counts nothing on an untouched filter", () => {
    expect(activeFilterCount(NO_GAME_FILTER)).toBe(0);
  });

  it("counts a period once however many of its ends are pinned", () => {
    expect(activeFilterCount({ ...NO_GAME_FILTER, from: "2026-07-01" })).toBe(
      1,
    );
    expect(
      activeFilterCount({
        ...NO_GAME_FILTER,
        from: "2026-07-01",
        until: "2026-07-31",
      }),
    ).toBe(1);
  });

  it("counts the boardgames once and every player on its own", () => {
    expect(
      activeFilterCount({
        ...NO_GAME_FILTER,
        boardgameIds: ["catan", "cascadia"] as BoardgameId[],
        playerIds: ["p1", "p2"] as PlayerId[],
      }),
    ).toBe(3);
  });

  it("counts a chosen status", () => {
    expect(activeFilterCount({ ...NO_GAME_FILTER, status: "ended" })).toBe(1);
  });
});

describe("filterGameList", () => {
  it("files a game under the day it STARTED, not the day it ended", () => {
    // A game still being played has no end date at all; filing on it would drop
    // every unfinished game out of any window.
    expect(
      filterGameList(all, { ...NO_GAME_FILTER, from: "2026-07-15" }),
    ).toEqual([cascadiaWithOne, catanLater]);

    // `catanLater` ran past midnight into the 21st, and a window closing on the
    // 20th still holds it: it is the evening it started that we remember.
    expect(
      filterGameList(all, { ...NO_GAME_FILTER, until: "2026-07-20" }),
    ).toEqual(all);
  });

  it("splits the running games from the finished ones", () => {
    expect(
      filterGameList(all, { ...NO_GAME_FILTER, status: "ongoing" }),
    ).toEqual([catanWithBoth, cascadiaWithOne]);
    expect(filterGameList(all, { ...NO_GAME_FILTER, status: "ended" })).toEqual(
      [catanLater],
    );
  });

  it("crosses every criterion", () => {
    expect(
      filterGameList(all, {
        boardgameIds: ["catan" as BoardgameId],
        playerIds: ["p2" as PlayerId],
        from: "2026-07-05",
        until: null,
        status: "ended",
      }),
    ).toEqual([catanLater]);
  });
});

describe("playedBoardgames", () => {
  it("offers each played game once, named and sorted", () => {
    const names: Record<string, string> = {
      catan: "Catan",
      cascadia: "Cascadia",
    };

    expect(playedBoardgames(all, id => names[id])).toEqual([
      { id: "cascadia", name: "Cascadia" },
      { id: "catan", name: "Catan" },
    ]);
  });

  it("still offers a game whose name it cannot resolve", () => {
    expect(playedBoardgames([catanLater], () => undefined)).toEqual([
      { id: "catan", name: "Jeu inconnu" },
    ]);
  });
});

describe("filterablePlayers", () => {
  it("offers everyone while nobody is picked", () => {
    expect(filterablePlayers(all, []).map(p => p.name)).toEqual([
      "Amélie",
      "Bruno",
      "Zoé",
    ]);
  });

  it("offers only those who share a game with everyone already picked", () => {
    // Bruno never sat at a table with Amélie, so offering him could only empty
    // the list.
    expect(filterablePlayers(all, ["p2" as PlayerId]).map(p => p.name)).toEqual(
      ["Amélie", "Zoé"],
    );
  });
});

describe("localDay", () => {
  // Every instant here is built from local parts, so the day asserted is the
  // one on the reader's own calendar whatever timezone the tests run in.
  it("files an instant under the day it is where the reader is", () => {
    const lateEvening = new Date(2026, 6, 20, 23, 30);

    expect(localDay(lateEvening.toISOString())).toBe("2026-07-20");
  });

  it("pads the month and the day out to two figures", () => {
    expect(localDay(new Date(2026, 0, 3, 12).toISOString())).toBe("2026-01-03");
  });

  it("files an instant it cannot read under no day at all", () => {
    expect(localDay("")).toBe("");
    expect(localDay("hier soir")).toBe("");
  });
});
