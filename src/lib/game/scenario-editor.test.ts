import { describe, expect, it } from "vitest";

import {
  MARINS_SCENARIOS_HREF,
  scenarioEditorHref,
} from "@/lib/game/scenario-editor";

describe("scenarioEditorHref", () => {
  it("sends the Marins extension to its scenario editor", () => {
    expect(scenarioEditorHref("catan-marins")).toBe(MARINS_SCENARIOS_HREF);
  });

  it("has no editor for an extension that cannot be authored yet", () => {
    expect(scenarioEditorHref("catan-villes-et-chevaliers")).toBeNull();
  });

  it("has no editor for an extension without a key", () => {
    expect(scenarioEditorHref(null)).toBeNull();
  });
});
