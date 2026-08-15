import { describe, expect, it } from "vitest";

import { dropdownSpace } from "./dropdown-space";

// A field halfway down a 664px-tall phone screen, the shape the wheel's search
// box has on an iPhone 13.
const anchor = { top: 220, bottom: 259 };
const screen = { top: 0, bottom: 664 };
// What the same screen leaves once the keyboard is up.
const keyboard = { top: 0, bottom: 364 };

describe("dropdownSpace", () => {
  it("opens below at its full height when the room is there", () => {
    expect(dropdownSpace(anchor, screen, 256)).toEqual({
      placement: "below",
      maxHeight: 256,
    });
  });

  it("keeps it below but shortens it to the room the keyboard leaves", () => {
    // 364 - 259 - 4 = 101 below, against 220 - 0 - 4 = 216 above… but 101 is
    // still worse than above, so this one flips.
    expect(dropdownSpace(anchor, keyboard, 256)).toEqual({
      placement: "above",
      maxHeight: 216,
    });
  });

  it("stays below when below is the better of the two", () => {
    // A field near the top of the screen: 40 above, 300 below.
    const high = { top: 44, bottom: 60 };

    expect(dropdownSpace(high, keyboard, 256)).toEqual({
      placement: "below",
      maxHeight: 256,
    });
  });

  it("shortens rather than flips when neither side takes the panel", () => {
    // 364 - 320 - 4 = 40 below, 300 - 0 - 4 = 296 above… below is the shorter
    // one here, so it flips; the panel takes what above has and no more.
    const low = { top: 300, bottom: 320 };

    expect(dropdownSpace(low, keyboard, 256)).toEqual({
      placement: "above",
      maxHeight: 256,
    });
  });

  it("never asks for more height than the panel wants", () => {
    const high = { top: 44, bottom: 60 };

    expect(dropdownSpace(high, screen, 120).maxHeight).toBe(120);
  });

  it("gives no height at all rather than a negative one", () => {
    // A field taller than what is left visible: neither side has any room.
    const taller = { top: 0, bottom: 400 };

    expect(dropdownSpace(taller, keyboard, 256)).toEqual({
      placement: "above",
      maxHeight: 0,
    });
  });

  it("leaves the gap out of the room it hands over", () => {
    // 664 - 259 = 405 of raw room; a 10px gap leaves 395.
    expect(dropdownSpace(anchor, screen, 500, 10).maxHeight).toBe(395);
  });
});
