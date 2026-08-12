import { describe, expect, it } from "vitest";

import { toggled } from "./selection";

describe("toggled", () => {
  it("adds an entry that wasn't picked yet, at the end", () => {
    expect(toggled(["a", "b"], "c")).toEqual(["a", "b", "c"]);
  });

  it("takes back an entry already picked, leaving the others in order", () => {
    expect(toggled(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("picks the first entry of an empty selection", () => {
    expect(toggled([], 7)).toEqual([7]);
  });

  it("leaves the list it was given untouched", () => {
    const list = ["a"];

    toggled(list, "b");

    expect(list).toEqual(["a"]);
  });
});
