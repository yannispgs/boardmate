import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceId } from "./device-id";

/** A tab's session storage, for a test that runs where there is none. */
function tabStorage() {
  const held = new Map<string, string>();

  return {
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => {
      held.set(key, value);
    },
  };
}

describe("deviceId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is the same phone for the whole tab, reloads included", () => {
    vi.stubGlobal("sessionStorage", tabStorage());

    const first = deviceId();

    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(deviceId()).toBe(first);
  });

  it("is somebody else in another tab", () => {
    vi.stubGlobal("sessionStorage", tabStorage());
    const here = deviceId();

    vi.stubGlobal("sessionStorage", tabStorage());

    expect(deviceId()).not.toBe(here);
  });

  it("still names a phone where there is no tab to remember it", () => {
    expect(deviceId()).not.toBe(deviceId());
  });
});
