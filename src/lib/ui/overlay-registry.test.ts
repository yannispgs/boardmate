import { describe, expect, it } from "vitest";

import {
  openOverlayCount,
  registerOverlay,
  subscribeOverlays,
} from "./overlay-registry";

describe("overlay registry", () => {
  it("counts overlays up and down", () => {
    const first = registerOverlay();
    const second = registerOverlay();

    expect(openOverlayCount()).toBe(2);

    second();

    // One still open: closing the second must not clear the first.
    expect(openOverlayCount()).toBe(1);

    first();

    expect(openOverlayCount()).toBe(0);
  });

  it("ignores a release called twice", () => {
    const release = registerOverlay();

    release();
    release();

    expect(openOverlayCount()).toBe(0);
  });

  it("notifies subscribers until they unsubscribe", () => {
    let calls = 0;
    const unsubscribe = subscribeOverlays(() => {
      calls += 1;
    });

    const release = registerOverlay();

    expect(calls).toBe(1);

    release();

    expect(calls).toBe(2);

    unsubscribe();
    registerOverlay()();

    expect(calls).toBe(2);
  });
});
