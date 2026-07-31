import { describe, expect, it } from "vitest";

import { emptyScenario } from "./scenario-draft";
import {
  freeName,
  parseScenarioText,
  serialiseScenario,
} from "./scenario-transfer";

describe("serialiseScenario / parseScenarioText", () => {
  it("reads back exactly what it wrote", () => {
    const spec = { ...emptyScenario(), name: "Les quatre îles" };
    const back = parseScenarioText(serialiseScenario(spec));

    expect(back).toEqual({ ok: true, spec });
  });

  it("refuses an empty box", () => {
    expect(parseScenarioText("   \n ")).toEqual({
      ok: false,
      refusal: "empty",
    });
  });

  it("refuses text that isn't JSON", () => {
    expect(parseScenarioText("Les quatre îles")).toEqual({
      ok: false,
      refusal: "not-json",
    });
  });

  it("refuses JSON that isn't a scenario", () => {
    expect(parseScenarioText('{"name":"x"}')).toEqual({
      ok: false,
      refusal: "not-a-scenario",
    });
    expect(parseScenarioText("[1, 2]")).toEqual({
      ok: false,
      refusal: "not-a-scenario",
    });
  });
});

describe("freeName", () => {
  it("keeps the name when nothing holds it", () => {
    expect(freeName("Les quatre îles", ["L'archipel"])).toBe("Les quatre îles");
  });

  it("numbers the copies from the second one on", () => {
    expect(freeName("Îles", ["Îles"])).toBe("Îles (copie)");
    expect(freeName("Îles", ["Îles", "Îles (copie)"])).toBe("Îles (copie 2)");
    expect(freeName("Îles", ["Îles", "Îles (copie)", "Îles (copie 2)"])).toBe(
      "Îles (copie 3)",
    );
  });
});
