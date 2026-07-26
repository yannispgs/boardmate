import { describe, expect, it } from "vitest";

import { matchesSearch, normalizeSearch, searchByName } from "./player-search";

describe("normalizeSearch", () => {
  it("drops case and accents", () => {
    expect(normalizeSearch("Amélie")).toBe("amelie");
    expect(normalizeSearch("FRANÇOIS")).toBe("francois");
  });
});

describe("matchesSearch", () => {
  it("finds the query anywhere in the name", () => {
    expect(matchesSearch("Jean-Baptiste", "bapt")).toBe(true);
    expect(matchesSearch("Jean-Baptiste", "jean")).toBe(true);
    expect(matchesSearch("Jean-Baptiste", "iste")).toBe(true);
  });

  it("ignores case and accents on both sides", () => {
    expect(matchesSearch("Amélie", "amelie")).toBe(true);
    expect(matchesSearch("Amelie", "AMÉLIE")).toBe(true);
  });

  it("keeps everyone while nothing is typed", () => {
    expect(matchesSearch("Amélie", "")).toBe(true);
    expect(matchesSearch("Amélie", "   ")).toBe(true);
  });

  it("says no to a name that does not hold the query", () => {
    expect(matchesSearch("Amélie", "zoe")).toBe(false);
  });
});

describe("searchByName", () => {
  it("keeps the matching names in the order given", () => {
    const players = [{ name: "Zoé" }, { name: "Amélie" }, { name: "Zacharie" }];

    expect(searchByName(players, "za")).toEqual([{ name: "Zacharie" }]);
    expect(searchByName(players, "z")).toEqual([
      { name: "Zoé" },
      { name: "Zacharie" },
    ]);
  });
});
