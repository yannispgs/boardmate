import { describe, expect, it } from "vitest";

import type {
  BoardgameId,
  ExtensionId,
  FaqEntry,
  FaqEntryId,
  FaqScope,
} from "@/lib/domain";
import {
  entriesInScope,
  groupByScope,
  moveEntry,
  nextSortOrder,
  sameScope,
  scopeKey,
  scopeLabel,
  searchFaq,
} from "@/lib/game/faq";

const APP: FaqScope = { kind: "app" };
const CATAN: FaqScope = {
  kind: "boardgame",
  boardgameId: "bg-catan" as BoardgameId,
};
const MARINS: FaqScope = {
  kind: "extension",
  extensionId: "ext-marins" as ExtensionId,
};

function entry(
  id: string,
  scope: FaqScope,
  sortOrder: number,
  question = "Question ?",
  answer = "Réponse.",
): FaqEntry {
  return {
    id: id as FaqEntryId,
    scope,
    question,
    answer,
    sortOrder,
    createdAt: "2026-08-03T10:00:00.000Z",
  };
}

describe("scopeKey", () => {
  it("names the app scope", () => {
    expect(scopeKey(APP)).toBe("app");
  });

  it("names a boardgame scope after its game", () => {
    expect(scopeKey(CATAN)).toBe("boardgame:bg-catan");
  });

  it("names an extension scope after its extension", () => {
    expect(scopeKey(MARINS)).toBe("extension:ext-marins");
  });

  it("never confuses a game and an extension of the same id", () => {
    const sameId: FaqScope = {
      kind: "extension",
      extensionId: "bg-catan" as ExtensionId,
    };

    expect(scopeKey(sameId)).not.toBe(scopeKey(CATAN));
  });
});

describe("sameScope", () => {
  it("holds for two scopes on the same game", () => {
    expect(sameScope(CATAN, { ...CATAN })).toBe(true);
  });

  it("fails across two different games", () => {
    const other: FaqScope = {
      kind: "boardgame",
      boardgameId: "bg-splito" as BoardgameId,
    };

    expect(sameScope(CATAN, other)).toBe(false);
  });
});

describe("entriesInScope", () => {
  const entries = [
    entry("c2", CATAN, 1),
    entry("a1", APP, 0),
    entry("c1", CATAN, 0),
    entry("m1", MARINS, 0),
  ];

  it("keeps only the scope asked for, in reading order", () => {
    expect(entriesInScope(entries, CATAN).map(e => e.id)).toEqual(["c1", "c2"]);
  });

  it("keeps the app scope apart from the games", () => {
    expect(entriesInScope(entries, APP).map(e => e.id)).toEqual(["a1"]);
  });

  it("answers nothing for a scope with no question yet", () => {
    const empty: FaqScope = {
      kind: "boardgame",
      boardgameId: "bg-none" as BoardgameId,
    };

    expect(entriesInScope(entries, empty)).toEqual([]);
  });
});

describe("searchFaq", () => {
  const entries = [
    entry(
      "q1",
      CATAN,
      0,
      "Peut-on échanger avec la banque ?",
      "Oui, 4 contre 1.",
    ),
    entry(
      "q2",
      CATAN,
      1,
      "Le voleur bloque-t-il la route ?",
      "Non, seulement la production.",
    ),
    entry(
      "q3",
      APP,
      0,
      "Comment ajouter une partie déjà jouée ?",
      "Depuis la liste des parties.",
    ),
  ];

  it("returns everything on an empty query", () => {
    expect(searchFaq(entries, "  ")).toHaveLength(3);
  });

  it("finds a word of the question", () => {
    expect(searchFaq(entries, "voleur").map(e => e.id)).toEqual(["q2"]);
  });

  it("finds a word of the answer too", () => {
    expect(searchFaq(entries, "production").map(e => e.id)).toEqual(["q2"]);
  });

  it("ignores case and accents", () => {
    expect(searchFaq(entries, "DEJA jouee").map(e => e.id)).toEqual(["q3"]);
  });

  it("searches across every scope at once", () => {
    expect(searchFaq(entries, "la ").map(e => e.id)).toEqual([
      "q1",
      "q2",
      "q3",
    ]);
  });

  it("answers nothing when no question matches", () => {
    expect(searchFaq(entries, "dragon")).toEqual([]);
  });
});

describe("groupByScope", () => {
  it("gathers the entries of each scope, in reading order", () => {
    const groups = groupByScope([
      entry("c2", CATAN, 1),
      entry("a1", APP, 0),
      entry("c1", CATAN, 0),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].scope).toEqual(CATAN);
    expect(groups[0].entries.map(e => e.id)).toEqual(["c1", "c2"]);
    expect(groups[1].entries.map(e => e.id)).toEqual(["a1"]);
  });

  it("orders the sections by their first match", () => {
    const groups = groupByScope([entry("a1", APP, 0), entry("c1", CATAN, 0)]);

    expect(groups.map(g => scopeKey(g.scope))).toEqual([
      "app",
      "boardgame:bg-catan",
    ]);
  });

  it("has no section to show for nothing at all", () => {
    expect(groupByScope([])).toEqual([]);
  });
});

describe("scopeLabel", () => {
  const boardgames = [{ id: "bg-catan" as BoardgameId, name: "Catan" }];
  const extensions = [
    { id: "ext-marins" as ExtensionId, name: "Catan - Marins" },
  ];

  it("names the app scope after the app", () => {
    expect(scopeLabel(APP, boardgames, extensions)).toBe("Boardmate");
  });

  it("names a game scope after its game", () => {
    expect(scopeLabel(CATAN, boardgames, extensions)).toBe("Catan");
  });

  it("names an extension scope after its extension", () => {
    expect(scopeLabel(MARINS, boardgames, extensions)).toBe("Catan - Marins");
  });

  it("falls back on a neutral word for a game it no longer knows", () => {
    expect(scopeLabel(CATAN, [], extensions)).toBe("Jeu");
  });

  it("falls back on a neutral word for an extension it no longer knows", () => {
    expect(scopeLabel(MARINS, boardgames, [])).toBe("Extension");
  });
});

describe("nextSortOrder", () => {
  it("starts a fresh scope at zero", () => {
    expect(nextSortOrder([entry("a1", APP, 7)], CATAN)).toBe(0);
  });

  it("lands after the last question of the scope", () => {
    const entries = [entry("c1", CATAN, 0), entry("c2", CATAN, 3)];

    expect(nextSortOrder(entries, CATAN)).toBe(4);
  });
});

describe("moveEntry", () => {
  const entries = [
    entry("c1", CATAN, 0),
    entry("c2", CATAN, 1),
    entry("c3", CATAN, 2),
    entry("a1", APP, 0),
  ];

  it("swaps a question with the one above it", () => {
    expect(moveEntry(entries, "c2" as FaqEntryId, "up")).toEqual([
      { id: "c2", sortOrder: 0 },
      { id: "c1", sortOrder: 1 },
    ]);
  });

  it("swaps a question with the one below it", () => {
    expect(moveEntry(entries, "c2" as FaqEntryId, "down")).toEqual([
      { id: "c3", sortOrder: 1 },
      { id: "c2", sortOrder: 2 },
    ]);
  });

  it("changes nothing at the top of the scope", () => {
    expect(moveEntry(entries, "c1" as FaqEntryId, "up")).toEqual([]);
  });

  it("changes nothing at the bottom of the scope", () => {
    expect(moveEntry(entries, "c3" as FaqEntryId, "down")).toEqual([]);
  });

  it("changes nothing for an entry that is not there", () => {
    expect(moveEntry(entries, "nope" as FaqEntryId, "up")).toEqual([]);
  });

  it("never looks outside the entry's own scope", () => {
    expect(moveEntry(entries, "a1" as FaqEntryId, "down")).toEqual([]);
  });

  it("renumbers a scope whose orders were all the same", () => {
    const flat = [
      entry("f1", CATAN, 0),
      entry("f2", CATAN, 0),
      entry("f3", CATAN, 0),
    ];

    expect(moveEntry(flat, "f3" as FaqEntryId, "up")).toEqual([
      { id: "f3", sortOrder: 1 },
      { id: "f2", sortOrder: 2 },
    ]);
  });
});
