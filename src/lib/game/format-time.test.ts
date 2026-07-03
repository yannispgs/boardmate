import { describe, expect, it } from "vitest";

import { formatDuration } from "./format-time";

describe("formatDuration", () => {
  it("formats sub-hour durations as m:ss with a zero-padded seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(7)).toBe("0:07");
    expect(formatDuration(72)).toBe("1:12");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("switches to h:mm:ss once it reaches an hour", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(3600 * 2 + 60 * 5 + 9)).toBe("2:05:09");
  });

  it("rounds fractional seconds and clamps negatives at zero", () => {
    expect(formatDuration(11.4)).toBe("0:11");
    expect(formatDuration(11.6)).toBe("0:12");
    expect(formatDuration(-3)).toBe("0:00");
  });
});
