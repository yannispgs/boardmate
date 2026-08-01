import { describe, expect, it } from "vitest";

import { stepIndex, swipeStep } from "./carousel";

describe("stepIndex", () => {
  it("walks forwards and backwards inside the ring", () => {
    expect(stepIndex(1, 1, 4)).toBe(2);
    expect(stepIndex(2, -1, 4)).toBe(1);
  });

  it("wraps round both ends", () => {
    expect(stepIndex(3, 1, 4)).toBe(0);
    expect(stepIndex(0, -1, 4)).toBe(3);
  });

  it("stays put on an empty carousel", () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});

describe("swipeStep", () => {
  it("asks for the next slide when the drag went left", () => {
    expect(swipeStep(-80, 5)).toBe(1);
  });

  it("asks for the previous slide when the drag went right", () => {
    expect(swipeStep(80, -5)).toBe(-1);
  });

  it("ignores a drag too short to be meant", () => {
    expect(swipeStep(-20, 0)).toBe(0);
  });

  it("ignores a drag that is really a scroll", () => {
    expect(swipeStep(-60, 90)).toBe(0);
  });
});
