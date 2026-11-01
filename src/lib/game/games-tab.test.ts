import { describe, expect, it } from "vitest";

import { gamesTabHref, shownTab, tabFromParam } from "./games-tab";

describe("gamesTabHref and tabFromParam", () => {
  it("reads back the tab each address was built for", () => {
    expect(gamesTabHref("live")).toBe("/games?vue=en-cours");
    expect(gamesTabHref("ended")).toBe("/games?vue=terminees");
    expect(tabFromParam("en-cours")).toBe("live");
    expect(tabFromParam("terminees")).toBe("ended");
  });

  it("asks for no tab on a missing, repeated or unknown value", () => {
    expect(tabFromParam(undefined)).toBeNull();
    expect(tabFromParam(["terminees", "en-cours"])).toBeNull();
    expect(tabFromParam("ended")).toBeNull();
  });
});

describe("shownTab", () => {
  it("keeps the tab asked for, even with nothing in it", () => {
    expect(shownTab("ended", 3)).toBe("ended");
    expect(shownTab("live", 0)).toBe("live");
  });

  it("opens on the running games, or on the history when none runs", () => {
    expect(shownTab(null, 2)).toBe("live");
    expect(shownTab(null, 0)).toBe("ended");
  });
});
