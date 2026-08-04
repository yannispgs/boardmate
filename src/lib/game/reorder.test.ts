import { describe, expect, it } from "vitest";

import { moveItem } from "./reorder";

describe("moveItem", () => {
  const items = ["a", "b", "c"];

  it("swaps an item with the one above it", () => {
    expect(moveItem(items, 1, "up")).toEqual(["b", "a", "c"]);
  });

  it("swaps an item with the one below it", () => {
    expect(moveItem(items, 1, "down")).toEqual(["a", "c", "b"]);
  });

  it("leaves the list alone at the top", () => {
    expect(moveItem(items, 0, "up")).toBe(items);
  });

  it("leaves the list alone at the bottom", () => {
    expect(moveItem(items, 2, "down")).toBe(items);
  });

  it("leaves the list alone for an index that names nothing", () => {
    expect(moveItem(items, 7, "up")).toBe(items);
    expect(moveItem(items, -1, "down")).toBe(items);
  });

  it("never touches the list it was given", () => {
    moveItem(items, 1, "up");

    expect(items).toEqual(["a", "b", "c"]);
  });
});
