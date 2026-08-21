import { describe, expect, it } from "vitest";

import { dropdownSpace, horizontalFit } from "./dropdown-space";

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

// A 390px-wide phone screen (iPhone 13), and the info icon as it sits at the
// two ends of the boardgame form: after a short caption, and near the right.
const phone = { left: 0, right: 390 };

describe("horizontalFit", () => {
  it("hangs the panel off the anchor's right edge when it fits", () => {
    const icon = { left: 356, right: 370 };

    expect(horizontalFit(icon, phone, 240)).toEqual({ left: 130, width: 240 });
  });

  it("pushes it back on screen when the anchor is too far left", () => {
    // « Mode de jeu » puts the icon at x≈90: 90 - 240 would start at -150.
    const icon = { left: 76, right: 90 };

    expect(horizontalFit(icon, phone, 240)).toEqual({ left: 8, width: 240 });
  });

  it("keeps the margin on the right when the anchor sits past the edge", () => {
    const icon = { left: 400, right: 414 };

    expect(horizontalFit(icon, phone, 240)).toEqual({ left: 142, width: 240 });
  });

  it("narrows the panel rather than letting it hang off a narrow screen", () => {
    const narrow = { left: 0, right: 200 };
    const icon = { left: 176, right: 190 };

    expect(horizontalFit(icon, narrow, 240)).toEqual({ left: 8, width: 184 });
  });

  it("honours a margin of its own", () => {
    const icon = { left: 76, right: 90 };

    expect(horizontalFit(icon, phone, 240, 16)).toEqual({
      left: 16,
      width: 240,
    });
  });
});
