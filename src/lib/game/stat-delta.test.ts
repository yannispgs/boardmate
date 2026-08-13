import { describe, expect, it } from "vitest";

import { statDelta } from "./stat-delta";

describe("statDelta", () => {
  it("has nothing to say without a reference", () => {
    expect(statDelta(9, null)).toBeNull();
  });

  it("reads a value above its reference", () => {
    expect(statDelta(9, 7.4)).toEqual({ direction: "above", text: "+1.6" });
  });

  it("reads a value below its reference", () => {
    expect(statDelta(15, 17.1)).toEqual({ direction: "below", text: "−2.1" });
  });

  it("calls a gap smaller than the shown precision level", () => {
    expect(statDelta(9, 9)).toEqual({ direction: "level", text: "=" });
    expect(statDelta(9.02, 9)).toEqual({ direction: "level", text: "=" });
  });

  it("rounds to the asked precision", () => {
    expect(statDelta(9.125, 9, 2)).toEqual({
      direction: "above",
      text: "+0.13",
    });
    expect(statDelta(9.004, 9, 2)).toEqual({ direction: "level", text: "=" });
  });
});
