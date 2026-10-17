import { describe, expect, it } from "vitest";

import { activeTab, showsBottomNav } from "./bottom-nav";

describe("activeTab", () => {
  it("lights the home tab on the home page and the tools", () => {
    expect(activeTab("/")).toBe("home");
    expect(activeTab("/tools/wheel")).toBe("home");
    expect(activeTab("/tools/board-generator/catan")).toBe("home");
  });

  it("lights each main section, its sub-pages included", () => {
    expect(activeTab("/games")).toBe("games");
    expect(activeTab("/games/new")).toBe("games");
    expect(activeTab("/boardgames")).toBe("boardgames");
    expect(activeTab("/boardgames/abc/records")).toBe("boardgames");
    expect(activeTab("/stats")).toBe("stats");
  });

  it("lights « Plus » on the screens behind it", () => {
    expect(activeTab("/players")).toBe("more");
    expect(activeTab("/faq")).toBe("more");
    expect(activeTab("/feedback")).toBe("more");
    expect(activeTab("/admin/history")).toBe("more");
  });

  it("lights nothing elsewhere, nor on a look-alike path", () => {
    expect(activeTab("/login")).toBeNull();
    expect(activeTab("/gamesx")).toBeNull();
  });
});

describe("showsBottomNav", () => {
  it("shows the bar on every signed-in screen", () => {
    expect(showsBottomNav("/")).toBe(true);
    expect(showsBottomNav("/games")).toBe(true);
    expect(showsBottomNav("/games/new")).toBe(true);
  });

  it("steps aside before signing in and over a game being played", () => {
    expect(showsBottomNav("/login")).toBe(false);
    expect(showsBottomNav("/auth/callback")).toBe(false);
    expect(showsBottomNav("/games/abc/play")).toBe(false);
  });
});
