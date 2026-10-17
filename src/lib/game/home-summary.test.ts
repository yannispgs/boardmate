import { describe, expect, it } from "vitest";

import type { GameListItem, PlayerId } from "@/lib/domain";

import {
  type HomeBoardgame,
  ongoingSummaries,
  recentSummaries,
} from "./home-summary";

function game(
  id: string,
  fields: Partial<GameListItem> & { winners?: string[] },
): GameListItem {
  const names = ["Yannou", "Candice"];

  return {
    id,
    boardgameId: fields.boardgameId ?? "catan",
    round: 1,
    stage: 1,
    startedAt: "2026-10-01T20:00:00Z",
    endedAt: null,
    ...fields,
    players: names.map(name => ({
      id: name as PlayerId,
      name,
      isWinner: fields.winners?.includes(name) ?? false,
      score: null,
    })),
  } as GameListItem;
}

const BOARDGAMES: Record<string, HomeBoardgame> = {
  catan: { name: "Catan", stages: null },
  odin: { name: "Odin", stages: { label: "Manche", advance: "manual" } },
};
const boardgameOf = (g: GameListItem) =>
  BOARDGAMES[g.boardgameId as unknown as string];

describe("ongoingSummaries", () => {
  it("names each running game with its progress, newest first", () => {
    const summaries = ongoingSummaries(
      [
        game("a", { round: 7, startedAt: "2026-10-01T20:00:00Z" }),
        game("b", {
          boardgameId: "odin" as GameListItem["boardgameId"],
          stage: 3,
          startedAt: "2026-10-01T21:00:00Z",
        }),
      ],
      boardgameOf,
    );

    expect(summaries).toEqual([
      { id: "b", title: "Odin · Manche 3", players: "Yannou, Candice" },
      { id: "a", title: "Catan · Tour 7", players: "Yannou, Candice" },
    ]);
  });

  it("still names a game whose boardgame is not loaded yet", () => {
    expect(ongoingSummaries([game("a", {})], () => undefined)[0].title).toBe(
      "Partie · Tour 1",
    );
  });
});

describe("recentSummaries", () => {
  const day = (iso: string) => iso.slice(0, 10);

  it("keeps the last ones ended, with their winners and day", () => {
    const summaries = recentSummaries(
      [
        game("old", { endedAt: "2026-10-02T23:00:00Z", winners: ["Yannou"] }),
        game("new", {
          endedAt: "2026-10-09T23:00:00Z",
          winners: ["Yannou", "Candice"],
        }),
        game("mid", { endedAt: "2026-10-05T23:00:00Z" }),
      ],
      boardgameOf,
      2,
      day,
    );

    expect(summaries).toEqual([
      { id: "new", name: "Catan", detail: "Yannou & Candice · 2026-10-09" },
      { id: "mid", name: "Catan", detail: "2026-10-05" },
    ]);
  });

  it("falls back on the start for a game with no end recorded", () => {
    const summaries = recentSummaries(
      [
        game("a", { startedAt: "2026-09-30T20:00:00Z" }),
        game("b", { endedAt: "2026-10-01T23:00:00Z" }),
        game("c", { startedAt: "2026-09-29T20:00:00Z" }),
      ],
      () => undefined,
      3,
      day,
    );

    expect(summaries).toEqual([
      { id: "b", name: "Partie", detail: "2026-10-01" },
      { id: "a", name: "Partie", detail: "2026-09-30" },
      { id: "c", name: "Partie", detail: "2026-09-29" },
    ]);
  });
});
