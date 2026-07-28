import { describe, expect, it } from "vitest";

import { toBoardGenerator } from "./boardgame";

describe("toBoardGenerator", () => {
  it("reads back a generator the app ships", () => {
    expect(toBoardGenerator("catan")).toBe("catan");
  });

  it("takes a game played on no generated board as having none", () => {
    expect(toBoardGenerator(null)).toBeNull();
  });

  it("refuses a generator the app cannot draw", () => {
    expect(toBoardGenerator("cascadia")).toBeNull();
  });
});
