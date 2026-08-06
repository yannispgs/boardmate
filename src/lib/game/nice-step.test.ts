import { describe, expect, it } from "vitest";

import { niceStep } from "./nice-step";

describe("niceStep", () => {
  it("rounds up to the nearest 1 / 2 / 5 × 10ⁿ", () => {
    expect(niceStep(0.8)).toBe(1);
    expect(niceStep(1.5)).toBe(2);
    expect(niceStep(3)).toBe(5);
    expect(niceStep(7)).toBe(10);
  });

  it("keeps a step that is already nice", () => {
    expect(niceStep(1)).toBe(1);
    expect(niceStep(2)).toBe(2);
    expect(niceStep(5)).toBe(5);
  });

  it("works at every order of magnitude", () => {
    expect(niceStep(0.03)).toBe(0.05);
    expect(niceStep(140)).toBe(200);
    expect(niceStep(6000)).toBe(10000);
  });

  it("falls back to 1 when there is no magnitude to round to", () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-4)).toBe(1);
  });
});
