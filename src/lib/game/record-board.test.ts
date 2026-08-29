import { describe, expect, it } from "vitest";

import type {
  Boardgame,
  BoardgameId,
  GameId,
  GameStatsRecord,
  PlayedExtension,
  PlayerId,
  ScoringSpec,
} from "@/lib/domain";
import {
  boardLines,
  boardSizes,
  boardTabs,
  recordBoard,
  sizeLabel,
  speedLabel,
  tabLabel,
} from "./record-board";

const GAME = "bg-1" as BoardgameId;
const OTHER_GAME = "bg-2" as BoardgameId;

const ann = "p-ann" as PlayerId;
const bob = "p-bob" as PlayerId;
const cat = "p-cat" as PlayerId;

const NAMES: Readonly<Record<string, string>> = {
  [ann]: "Ann",
  [bob]: "Bob",
  [cat]: "Cat",
};

/** The plainest scored game there is: one total per player, highest wins. */
const HIGHEST: ScoringSpec = {
  timing: "final",
  entry: "total",
  stopCondition: null,
  winCondition: { type: "highest" },
};

const LOWEST: ScoringSpec = { ...HIGHEST, winCondition: { type: "lowest" } };

/** A game raced towards a score the biggest total takes (Catan, Splendor). */
const RACE: ScoringSpec = {
  timing: "live",
  entry: "total",
  stopCondition: { type: "scoreTarget", field: "pointsToWin" },
  winCondition: { type: "highest" },
};

const MARINS: PlayedExtension = { name: "Marins", scenarioName: null };

/** The boardgame as the board reads it — only four fields of it matter. */
function boardgame(
  scoring: ScoringSpec | null,
  range: [number, number] | null = null,
): Pick<Boardgame, "id" | "minPlayers" | "maxPlayers" | "scoring"> {
  return {
    id: GAME,
    minPlayers: range === null ? null : range[0],
    maxPlayers: range === null ? null : range[1],
    scoring,
  };
}

/** A finished party, written the short way the tests read best in. */
function party(
  id: string,
  scores: Array<[PlayerId, number | null]>,
  extra: Readonly<{
    boardgameId?: BoardgameId;
    extensions?: PlayedExtension[];
    winners?: PlayerId[];
    rounds?: number;
    target?: number | null;
    /** A party keyed in after the fact logs no turn — and never raced. */
    played?: boolean;
  }> = {},
): GameStatsRecord {
  const winners = extra.winners ?? [];

  return {
    gameId: id as GameId,
    boardgameId: extra.boardgameId ?? GAME,
    boardgameName: "Jeu",
    dice: null,
    endedAt: null,
    rounds: extra.rounds ?? 1,
    winThreshold: extra.target === undefined ? null : extra.target,
    // Left out entirely rather than defaulted to `[]`: the adapter always sets
    // it, but the field is optional and a party read without it must land in
    // the base game's basket all the same.
    ...(extra.extensions === undefined ? {} : { extensions: extra.extensions }),
    players: scores.map(([playerId, score], seatOrder) => ({
      playerId,
      name: NAMES[playerId],
      seatOrder,
      isWinner: winners.includes(playerId),
      score,
    })),
    turns:
      extra.played === false
        ? []
        : [
            {
              playerId: scores[0][0],
              round: 1,
              durationS: 30,
              pauseDurationS: 0,
              overtimeS: 0,
            },
          ],
    diceRolls: [],
  };
}

/** The single tab of a board that has no extension in play. */
function onlyTab(board: ReturnType<typeof recordBoard>) {
  return board.tabs[0];
}

describe("tabLabel", () => {
  it("names the base game rather than leaving its tab blank", () => {
    expect(tabLabel("")).toBe("Jeu de base");
    expect(tabLabel("Marins")).toBe("Marins");
  });
});

describe("sizeLabel", () => {
  it("says which table size, or that the game answers to one figure", () => {
    expect(sizeLabel(4)).toBe("4 joueurs");
    expect(sizeLabel(null)).toBe("Toutes tailles");
  });
});

describe("speedLabel", () => {
  it("names the course: the scenarios played, then the finish line", () => {
    expect(speedLabel([], 10)).toBe("10 points");
    expect(
      speedLabel([{ name: "Marins", scenarioName: "Les quatre îles" }], 14),
    ).toBe("Les quatre îles — 14 points");
    expect(
      speedLabel(
        [
          { name: "Marins", scenarioName: "Les quatre îles" },
          { name: "Villes", scenarioName: "Le désert" },
        ],
        18,
      ),
    ).toBe("Les quatre îles + Le désert — 18 points");
  });
});

describe("boardSizes", () => {
  it("offers what the box allows and what was actually played", () => {
    // Forêt Mixte is declared 2–4 and has a party at 5: bounding the grid by
    // the box would hide a record somebody really holds.
    expect(boardSizes({ minPlayers: 2, maxPlayers: 4 }, [5, 3])).toEqual([
      2, 3, 4, 5,
    ]);
  });

  it("falls back to the sizes played when the box declares no range", () => {
    expect(
      boardSizes({ minPlayers: null, maxPlayers: null }, [3, 3, 5]),
    ).toEqual([3, 5]);
  });
});

describe("boardTabs", () => {
  it("opens on the base game, then every extension the game declares", () => {
    expect(boardTabs(["Marins", "Villes"], [])).toEqual([
      "",
      "Marins",
      "Villes",
    ]);
  });

  it("adds a combination that was played but never declared as one", () => {
    expect(boardTabs(["Marins"], ["", "Marins", "Marins + Villes"])).toEqual([
      "",
      "Marins",
      "Marins + Villes",
    ]);
  });
});

describe("recordBoard — what a game keeps at all", () => {
  it("keeps a score record on a plainly scored game, and nothing else", () => {
    expect(
      recordBoard({
        boardgame: boardgame(HIGHEST),
        extensions: [],
        records: [],
      }).metrics,
    ).toEqual(["score"]);
  });

  it("keeps only the laps on a race that silenced its scores (Catan)", () => {
    const board = recordBoard({
      boardgame: boardgame({ ...RACE, trackRecords: false }),
      extensions: [],
      records: [],
    });

    expect(board.metrics).toEqual(["speed"]);
  });

  it("keeps both on a race that still compares its scores (Splendor)", () => {
    const board = recordBoard({
      boardgame: boardgame(RACE),
      extensions: [],
      records: [],
    });

    expect(board.metrics).toEqual(["score", "speed"]);
  });

  it("keeps nothing at all on a game that compares neither (Papayoo)", () => {
    const board = recordBoard({
      boardgame: boardgame({ ...LOWEST, trackRecords: false }),
      extensions: [],
      records: [],
    });

    expect(board.metrics).toEqual([]);
  });

  it("keeps nothing on a game that isn't scored", () => {
    expect(
      recordBoard({ boardgame: boardgame(null), extensions: [], records: [] })
        .metrics,
    ).toEqual([]);
  });
});

describe("recordBoard — the score marks", () => {
  it("crowns the best figure posted, and lists where everyone stands", () => {
    const board = recordBoard({
      boardgame: boardgame(HIGHEST),
      extensions: [],
      records: [
        party("g-1", [
          [ann, 90],
          [bob, 40],
        ]),
        party("g-2", [
          [ann, 70],
          [bob, 110],
        ]),
      ],
    });
    const row = onlyTab(board).rows[0];

    expect(row.label).toBe("Toutes tailles");
    expect(row.parties).toBe(2);
    expect(row.entries).toHaveLength(1);

    const entry = row.entries[0];

    expect(entry.metric).toBe("score");
    expect(entry.label).toBeNull();
    expect(entry.value).toBe(110);
    expect(entry.holders).toEqual(["Bob"]);
    expect(entry.bests).toEqual([
      { playerId: bob, name: "Bob", value: 110, parties: 2 },
      { playerId: ann, name: "Ann", value: 90, parties: 2 },
    ]);
  });

  it("reads the small end of the scale on a game won by scoring little", () => {
    const board = recordBoard({
      boardgame: boardgame(LOWEST),
      extensions: [],
      records: [
        party("g-1", [
          [ann, 90],
          [bob, 40],
        ]),
      ],
    });
    const entry = onlyTab(board).rows[0].entries[0];

    expect(entry.value).toBe(40);
    expect(entry.bests.map(b => b.name)).toEqual(["Bob", "Ann"]);
  });

  it("keeps each player's own best across his parties, not his latest", () => {
    const board = recordBoard({
      boardgame: boardgame(LOWEST),
      extensions: [],
      records: [
        party("g-1", [
          [ann, 90],
          [bob, 40],
        ]),
        party("g-2", [
          [ann, 20],
          [bob, 60],
        ]),
      ],
    });
    const entry = onlyTab(board).rows[0].entries[0];

    expect(entry.value).toBe(20);
    expect(entry.bests).toEqual([
      { playerId: ann, name: "Ann", value: 20, parties: 2 },
      { playerId: bob, name: "Bob", value: 40, parties: 2 },
    ]);
  });

  it("names every player level on the mark, not just the first of them", () => {
    const board = recordBoard({
      boardgame: boardgame(HIGHEST),
      extensions: [],
      records: [
        party("g-1", [
          [ann, 90],
          [bob, 90],
        ]),
      ],
    });

    expect(onlyTab(board).rows[0].entries[0].holders).toEqual(["Ann", "Bob"]);
  });

  it("ignores a seat left unscored rather than reading it as a nought", () => {
    const board = recordBoard({
      boardgame: boardgame(LOWEST),
      extensions: [],
      records: [
        party("g-1", [
          [ann, 90],
          [bob, null],
        ]),
      ],
    });
    const entry = onlyTab(board).rows[0].entries[0];

    expect(entry.value).toBe(90);
    expect(entry.bests.map(b => b.name)).toEqual(["Ann"]);
  });

  it("leaves a cell nobody has played unattributed", () => {
    const board = recordBoard({
      boardgame: boardgame(HIGHEST),
      extensions: [],
      records: [],
    });
    const row = onlyTab(board).rows[0];

    expect(row.parties).toBe(0);
    expect(row.entries).toEqual([]);
  });

  it("never reads a party of another game into this one's board", () => {
    const board = recordBoard({
      boardgame: boardgame(HIGHEST),
      extensions: [],
      records: [party("g-1", [[ann, 90]], { boardgameId: OTHER_GAME })],
    });

    expect(onlyTab(board).rows[0].parties).toBe(0);
  });
});

describe("recordBoard — the grid", () => {
  it("splits by table size only where the game says its scale moves", () => {
    const board = recordBoard({
      boardgame: boardgame({ ...HIGHEST, playerCountSensitive: true }, [2, 3]),
      extensions: [],
      records: [
        party("g-1", [
          [ann, 90],
          [bob, 40],
        ]),
        party("g-2", [
          [ann, 50],
          [bob, 60],
          [cat, 200],
        ]),
      ],
    });
    const rows = onlyTab(board).rows;

    expect(rows.map(r => r.label)).toEqual(["2 joueurs", "3 joueurs"]);
    expect(rows[0].entries[0].value).toBe(90);
    expect(rows[1].entries[0].value).toBe(200);
  });

  it("reads a game whose scale doesn't move on one line for every table", () => {
    const board = recordBoard({
      boardgame: boardgame(HIGHEST, [2, 4]),
      extensions: [],
      records: [
        party("g-1", [
          [ann, 90],
          [bob, 40],
        ]),
      ],
    });
    const rows = onlyTab(board).rows;

    expect(rows).toHaveLength(1);
    expect(rows[0].playerCount).toBeNull();
    expect(rows[0].entries[0].value).toBe(90);
  });

  it("gives an extension its own tab, declared or merely played", () => {
    const board = recordBoard({
      boardgame: boardgame(HIGHEST),
      extensions: ["Marins"],
      records: [
        party("g-1", [[ann, 90]]),
        party("g-2", [[bob, 200]], { extensions: [MARINS] }),
      ],
    });

    expect(board.tabs.map(t => t.label)).toEqual(["Jeu de base", "Marins"]);
    // The 200 made with Marins never lands in the base game's cell: that board
    // hands out points the base game never had.
    expect(board.tabs[0].rows[0].entries[0].value).toBe(90);
    expect(board.tabs[1].rows[0].entries[0].value).toBe(200);
  });

  it("shows a declared extension nobody has played as up for grabs", () => {
    const board = recordBoard({
      boardgame: boardgame(HIGHEST),
      extensions: ["Océanie"],
      records: [party("g-1", [[ann, 90]])],
    });

    expect(board.tabs[1].label).toBe("Océanie");
    expect(board.tabs[1].rows[0].parties).toBe(0);
    expect(board.tabs[1].rows[0].entries).toEqual([]);
  });
});

describe("recordBoard — the speed marks", () => {
  const catan = boardgame({ ...RACE, trackRecords: false });

  it("crowns the fewest laps, one line per finish line", () => {
    const board = recordBoard({
      boardgame: catan,
      extensions: [],
      records: [
        party("g-1", [[ann, 10]], { winners: [ann], rounds: 12, target: 10 }),
        party("g-2", [[bob, 10]], { winners: [bob], rounds: 9, target: 10 }),
        party("g-3", [[cat, 12]], { winners: [cat], rounds: 4, target: 12 }),
      ],
    });
    const entries = onlyTab(board).rows[0].entries;

    expect(entries.map(e => e.label)).toEqual(["10 points", "12 points"]);
    expect(entries[0].value).toBe(9);
    expect(entries[0].holders).toEqual(["Bob"]);
    expect(entries[0].bests).toEqual([
      { playerId: bob, name: "Bob", value: 9, parties: 1 },
      { playerId: ann, name: "Ann", value: 12, parties: 1 },
    ]);
    // A shorter race to another line takes nothing off the one above.
    expect(entries[1].value).toBe(4);
  });

  it("splits the lines of a cell by scenario, while sharing its tab", () => {
    const isles: PlayedExtension = {
      name: "Marins",
      scenarioName: "Les quatre îles",
    };
    const desert: PlayedExtension = {
      name: "Marins",
      scenarioName: "Le désert",
    };
    const board = recordBoard({
      boardgame: catan,
      extensions: ["Marins"],
      records: [
        party("g-1", [[ann, 14]], {
          winners: [ann],
          rounds: 11,
          target: 14,
          extensions: [isles],
        }),
        party("g-2", [[bob, 14]], {
          winners: [bob],
          rounds: 8,
          target: 14,
          extensions: [desert],
        }),
      ],
    });
    const marins = board.tabs[1];

    expect(marins.label).toBe("Marins");
    expect(marins.rows[0].entries.map(e => e.label)).toEqual([
      "Les quatre îles — 14 points",
      "Le désert — 14 points",
    ]);
  });

  it("names the course by its finish line alone when it has no scenario", () => {
    const board = recordBoard({
      boardgame: catan,
      extensions: ["Marins"],
      records: [
        party("g-1", [[ann, 10]], {
          winners: [ann],
          rounds: 9,
          target: 10,
          extensions: [MARINS],
        }),
      ],
    });

    expect(board.tabs[1].rows[0].entries[0].label).toBe("10 points");
  });

  it("credits the laps to whoever reached the target, runners-up aside", () => {
    const board = recordBoard({
      boardgame: catan,
      extensions: [],
      records: [
        party(
          "g-1",
          [
            [ann, 10],
            [bob, 7],
          ],
          { winners: [ann], rounds: 9, target: 10 },
        ),
      ],
    });

    expect(onlyTab(board).rows[0].entries[0].bests).toEqual([
      { playerId: ann, name: "Ann", value: 9, parties: 1 },
    ]);
  });

  it("shares the mark when the victory was shared", () => {
    const board = recordBoard({
      boardgame: catan,
      extensions: [],
      records: [
        party(
          "g-1",
          [
            [ann, 10],
            [bob, 10],
          ],
          { winners: [ann, bob], rounds: 9, target: 10 },
        ),
      ],
    });

    expect(onlyTab(board).rows[0].entries[0].holders).toEqual(["Ann", "Bob"]);
  });

  it("leaves out a party keyed in after the fact, which never raced", () => {
    const board = recordBoard({
      boardgame: catan,
      extensions: [],
      records: [
        party("g-1", [[ann, 10]], {
          winners: [ann],
          rounds: 1,
          target: 10,
          played: false,
        }),
      ],
    });
    const row = onlyTab(board).rows[0];

    // It still counts as a party played on the game — it just holds no mark.
    expect(row.parties).toBe(1);
    expect(row.entries).toEqual([]);
  });

  it("leaves out a race whose finish line was never recorded", () => {
    const board = recordBoard({
      boardgame: catan,
      extensions: [],
      records: [
        party("g-1", [[ann, 10]], { winners: [ann], rounds: 9, target: null }),
      ],
    });

    expect(onlyTab(board).rows[0].entries).toEqual([]);
  });
});

describe("boardLines", () => {
  const catan = boardgame(
    { ...RACE, trackRecords: false, playerCountSensitive: true },
    [3, 4],
  );

  it("gives a size holding two marks a line each", () => {
    const board = recordBoard({
      boardgame: catan,
      extensions: [],
      records: [
        party(
          "g-1",
          [
            [ann, 10],
            [bob, 4],
            [cat, 3],
          ],
          {
            winners: [ann],
            rounds: 17,
            target: 10,
          },
        ),
        party(
          "g-2",
          [
            [ann, 15],
            [bob, 9],
            [cat, 7],
          ],
          {
            winners: [ann],
            rounds: 9,
            target: 15,
          },
        ),
      ],
    });
    const lines = boardLines(onlyTab(board).rows);

    expect(lines.map(l => [l.row.label, l.entry?.label ?? null])).toEqual([
      ["3 joueurs", "10 points"],
      ["3 joueurs", "15 points"],
      ["4 joueurs", null],
    ]);
    // Each line stands on its own: two races to two finish lines never met.
    expect(lines[0].entry?.value).toBe(17);
    expect(lines[1].entry?.value).toBe(9);
  });

  it("keeps a size nobody has played, as the line left to take", () => {
    const board = recordBoard({
      boardgame: catan,
      extensions: [],
      records: [],
    });
    const lines = boardLines(onlyTab(board).rows);

    expect(lines.map(l => l.entry)).toEqual([null, null]);
    expect(lines.map(l => l.key)).toEqual(["3 joueurs", "4 joueurs"]);
  });

  it("keys a mark by its size and its own course, so two never collide", () => {
    const board = recordBoard({
      boardgame: boardgame(HIGHEST),
      extensions: [],
      records: [party("g-1", [[ann, 30]])],
    });

    expect(boardLines(onlyTab(board).rows).map(l => l.key)).toEqual([
      "Toutes tailles|score",
    ]);
  });
});
