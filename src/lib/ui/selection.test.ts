import { describe, expect, it } from "vitest";

import { moved, toggled } from "./selection";

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

describe("moved", () => {
  it("moves an entry down, the ones it passes moving up a seat", () => {
    expect(moved(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an entry up, the ones it passes moving down a seat", () => {
    expect(moved(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("leaves the order alone when an entry is dropped where it was", () => {
    expect(moved(["a", "b"], "b", "b")).toEqual(["a", "b"]);
  });

  it("leaves the order alone for an entry that is not picked", () => {
    expect(moved(["a", "b"], "z", "a")).toEqual(["a", "b"]);
    expect(moved(["a", "b"], "a", "z")).toEqual(["a", "b"]);
  });

  it("leaves the list it was given untouched", () => {
    const list = ["a", "b"];

    moved(list, "a", "b");

    expect(list).toEqual(["a", "b"]);
  });
});
