import { describe, expect, it } from "vitest";

import { tooltipPlacement } from "./tooltip-placement";

const list = { top: 100, bottom: 700 };

describe("tooltipPlacement", () => {
  it("opens above when the room is there", () => {
    expect(tooltipPlacement({ top: 400, bottom: 420 }, list, 60)).toBe("top");
  });

  it("flips below for the first card, tight against the top", () => {
    expect(tooltipPlacement({ top: 110, bottom: 130 }, list, 60)).toBe(
      "bottom",
    );
  });

  it("opens above with exactly enough room", () => {
    expect(tooltipPlacement({ top: 160, bottom: 180 }, list, 60)).toBe("top");
  });

  it("opens below with exactly enough room underneath", () => {
    expect(tooltipPlacement({ top: 110, bottom: 640 }, list, 60)).toBe(
      "bottom",
    );
  });

  it("falls back above when neither side fits", () => {
    expect(tooltipPlacement({ top: 110, bottom: 660 }, list, 60)).toBe("top");
  });

  it("reads a trigger scrolled past the top as no room above", () => {
    expect(tooltipPlacement({ top: 40, bottom: 60 }, list, 60)).toBe("bottom");
  });
});
