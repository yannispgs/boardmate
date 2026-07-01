import { describe, expect, it } from "vitest";

import { formatRetryDelay } from "./retry-delay";

describe("formatRetryDelay", () => {
  it("shows seconds below a minute", () => {
    expect(formatRetryDelay(45)).toBe("45 s");
    expect(formatRetryDelay(30)).toBe("30 s");
  });

  it("never shows zero seconds", () => {
    expect(formatRetryDelay(0)).toBe("1 s");
  });

  it("switches to whole minutes at 60s, rounding up", () => {
    expect(formatRetryDelay(60)).toBe("1 min");
    expect(formatRetryDelay(61)).toBe("2 min");
    expect(formatRetryDelay(300)).toBe("5 min");
  });
});
