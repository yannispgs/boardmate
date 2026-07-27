import { describe, expect, it } from "vitest";

import {
  editableScenarioKey,
  extensionScenariosHref,
  extensionsBackLink,
  MARINS_KEY,
  MARINS_ORIGIN,
} from "@/lib/game/scenario-editor";

describe("extensionScenariosHref", () => {
  it("sends a scenario back to the game it extends", () => {
    expect(extensionScenariosHref("catan-id")).toBe(
      "/boardgames/catan-id/extensions",
    );
  });

  it("says where it comes from when it has somewhere to go back to", () => {
    expect(extensionScenariosHref("catan-id", MARINS_ORIGIN)).toBe(
      "/boardgames/catan-id/extensions?from=catan-marins",
    );
  });
});

describe("extensionsBackLink", () => {
  it("goes back to the screen that linked here", () => {
    expect(extensionsBackLink(MARINS_ORIGIN)).toEqual({
      href: "/tools/board-generator/catan-marins",
      label: "← Plateau Catan - Marins",
    });
  });

  it("goes back to the games when nothing claims the visit", () => {
    expect(extensionsBackLink(undefined)).toEqual({
      href: "/boardgames",
      label: "← Jeux",
    });
  });

  it("never follows an origin it does not know", () => {
    expect(extensionsBackLink("https://evil.example")).toEqual({
      href: "/boardgames",
      label: "← Jeux",
    });
    expect(extensionsBackLink("toString")).toEqual({
      href: "/boardgames",
      label: "← Jeux",
    });
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
