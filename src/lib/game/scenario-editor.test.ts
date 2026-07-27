import { describe, expect, it } from "vitest";

import {
  editableScenarioKey,
  extensionScenariosHref,
  MARINS_KEY,
} from "@/lib/game/scenario-editor";

describe("extensionScenariosHref", () => {
  it("sends a scenario back to the game it extends", () => {
    expect(extensionScenariosHref("catan-id")).toBe(
      "/boardgames/catan-id/extensions",
    );
  });
});

describe("editableScenarioKey", () => {
  it("lets the Marins extension author its scenarios", () => {
    expect(editableScenarioKey(MARINS_KEY)).toBe(MARINS_KEY);
  });

  it("has no editor for an extension that cannot be authored yet", () => {
    expect(editableScenarioKey("catan-villes-et-chevaliers")).toBeNull();
  });

  it("has no editor for an extension without a key", () => {
    expect(editableScenarioKey(null)).toBeNull();
  });
});
