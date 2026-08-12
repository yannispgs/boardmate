import { describe, expect, it } from "vitest";

import { digitsOnly, numberOf } from "./number-input";

describe("digitsOnly", () => {
  it("keeps a number typed straight", () => {
    expect(digitsOnly("42")).toBe("42");
  });

  it("drops what a numeric keyboard offers but a count has no use for", () => {
    expect(digitsOnly("-3,5")).toBe("35");
  });

  it("leaves an emptied box empty", () => {
    expect(digitsOnly("")).toBe("");
  });
});

describe("numberOf", () => {
  it("reads the digits typed", () => {
    expect(numberOf("7")).toBe(7);
    expect(numberOf("012")).toBe(12);
  });

  it("counts an emptied box as nothing rather than NaN", () => {
    expect(numberOf("")).toBe(0);
  });
});
